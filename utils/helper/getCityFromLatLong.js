import DeliveryService from "../../models/DeliveryService.js";
import axios from "axios";
// Updated extractBlaBlaCarStops — handles both old (no city) and new (has city) data
// now accepts optional `rideId` so we can heal the DB when enriching old records.
export const extractBlaBlaCarStops = async (
  routePath,
  startLat,
  startLong,
  endLat,
  endLong,
  apiKey,
  rideId = null, // <-- new optional argument
) => {
  // handle missing/empty route gracefully
  if (!Array.isArray(routePath) || routePath.length === 0) {
    return [];
  }

  const findClosestIndex = (lat, long) => {
    let minDist = Infinity, minIdx = 0;
    routePath.forEach((point, i) => {
      const dist = Math.pow(point.lat - lat, 2) + Math.pow(point.long - long, 2);
      if (dist < minDist) { minDist = dist; minIdx = i; }
    });
    return minIdx;
  };

  const pickupIdx  = findClosestIndex(startLat, startLong);
  const dropoffIdx = findClosestIndex(endLat, endLong);
  const from = Math.min(pickupIdx, dropoffIdx);
  const to   = Math.max(pickupIdx, dropoffIdx);

  const routeSlice = routePath.slice(from, to + 1);

  // ✅ Check if this ride has pre-enriched city data
  const hasCity = routeSlice.some(p => p.city);

  let enrichedSlice = routeSlice;

  // if we don't know any cities and caller didn't provide an API key
  // then we can't reverse-geocode; as a fallback return the raw
  // coordinates between start/end so callers still see "stoppage"
  // information. (city will be null in that case.)
 if (!hasCity && !apiKey) {
  return []; // can't geocode without key, return empty
}

  if (!hasCity && apiKey) {
    // ✅ Fallback: reverse geocode on-the-fly for old data (sample every 4th point)
    const SAMPLE_EVERY = 4;
    enrichedSlice = await Promise.all(
      routeSlice.map(async (point, i) => {
        if (i % SAMPLE_EVERY === 0) {
          const city = await getCityFromLatLong(point.lat, point.long, apiKey);
          return { ...point, city };
        }
        return { ...point, city: null };
      })
    );

    // ✅ Also persist city back to DB so next search is instant (heal old data)
    const fullSliceWithIndex = routePath.map((point, i) => {
      if (i >= from && i <= to && (i - from) % SAMPLE_EVERY === 0) {
        const enriched = enrichedSlice[i - from];
        return { ...point, city: enriched?.city || null };
      }
      return point;
    });

    // Background save — don't await, don't block response
    // use rideId when provided; fall back to routePath._id if somebody passed
    // the entire ride object by mistake.
    const idToUpdate = rideId || routePath._id;
    if (idToUpdate) {
      DeliveryService.findByIdAndUpdate(
        idToUpdate,
        { $set: { route_path: fullSliceWithIndex } }
      ).catch(console.error);
    }
  }

  // Extract unique ordered stops
  const seen = new Set();
  const stops = [];

 for (const point of enrichedSlice) {
  if (point.city && !seen.has(point.city)) {  // ✅ point.city already guards null
    seen.add(point.city);
    stops.push({ city: point.city, lat: point.lat, long: point.long });
  }
}

  // Remove first & last (pickup/dropoff themselves)
  const resultStops = stops.slice(1, -1).filter(s => s.city !== null);
return resultStops;

  // // another safety net: if we still ended up with no named stops but the
  // // sliced route has intermediate points, return their coords instead of
  // // an empty list.
  // if (resultStops.length === 0 && routeSlice.length > 2) {
  //   return routeSlice.slice(1, -1).map(p => ({ city: null, lat: p.lat, long: p.long }));
  // }

  // return resultStops;
};
export const getCityFromLatLong = async (lat, long, apiKey) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${apiKey}`;
    const res = await axios.get(url);
    const components = res.data.results[0]?.address_components || [];

    return (
      components.find(c => c.types.includes("locality"))?.long_name ||
      components.find(c => c.types.includes("sublocality_level_1"))?.long_name ||
      components.find(c => c.types.includes("administrative_area_level_3"))?.long_name ||
      null
    );
  } catch {
    return null;
  }
};

export // Helper — get ordered road stops between two points using Directions API
const getRoadStops = async (startLat, startLong, endLat, endLong, apiKey) => {
  try {
    // Step 1: Get the full route from Google
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLong}&destination=${endLat},${endLong}&key=${apiKey}`;
    const response = await axios.get(url);
    const route = response.data.routes[0];
    if (!route) return [];

    const steps = route.legs[0]?.steps || [];

    // Step 2: Extract HTML instructions to get town/city names
    // Google puts place names in step instructions like "Turn left onto NH-44 in Ambala"
    // Better: use geocoding on step end_locations spaced far apart

    // Collect points every ~15km apart using cumulative distance
    const points = [];
    let cumDist = 0;
    const INTERVAL_METERS = 15000; // every 15km = one potential stop
    let nextThreshold = INTERVAL_METERS;

    for (const step of steps) {
      cumDist += step.distance.value;
      if (cumDist >= nextThreshold) {
        points.push({
          lat: step.end_location.lat,
          long: step.end_location.lng,
        });
        nextThreshold += INTERVAL_METERS;
      }
    }

    // Step 3: Reverse geocode only these spaced points (~1 per 15km)
    const cityResults = await Promise.all(
      points.map(async (p) => {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${p.lat},${p.long}&key=${apiKey}`;
        const geoRes = await axios.get(geoUrl);
        const components = geoRes.data.results[0]?.address_components || [];

        const city =
          components.find(c => c.types.includes("locality"))?.long_name ||
          components.find(c => c.types.includes("sublocality_level_1"))?.long_name ||
          components.find(c => c.types.includes("administrative_area_level_3"))?.long_name ||
          null;

        return city ? { city, lat: p.lat, long: p.long } : null;
      })
    );

    // Step 4: Remove nulls and deduplicate
    const seen = new Set();
    const stops = [];
    for (const s of cityResults) {
      if (s && !seen.has(s.city)) {
        seen.add(s.city);
        stops.push(s);
      }
    }

    return stops; // ordered by road route
  } catch (e) {
    console.error("getRoadStops error:", e.message);
    return [];
  }
};

export // Helper — filter road_stops between user's pickup and dropoff
const filterStopsBetween = (roadStops, startLat, startLong, endLat, endLong) => {
  if (!roadStops?.length) return [];

  // Find closest stop index to user's pickup
  const findClosest = (lat, long) => {
    let minDist = Infinity, minIdx = -1;
    roadStops.forEach((stop, i) => {
      const dist = Math.pow(stop.lat - lat, 2) + Math.pow(stop.long - long, 2);
      if (dist < minDist) { minDist = dist; minIdx = i; }
    });
    return minIdx;
  };

  const pickupIdx  = findClosest(startLat, startLong);
  const dropoffIdx = findClosest(endLat, endLong);

  if (pickupIdx === -1 || dropoffIdx === -1) return [];

  const from = Math.min(pickupIdx, dropoffIdx);
  const to   = Math.max(pickupIdx, dropoffIdx);

  // Return only stops strictly between pickup and dropoff (exclude endpoints)
  return roadStops.slice(from + 1, to);
};

/**
 * Haversine distance between two lat/long points in km.
 */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Validate that the user's "from" point appears BEFORE their "to" point
 * on the ride's route_path. This prevents matching rides going in the
 * wrong direction.
 *
 * @returns {boolean} true if direction is valid (from before to)
 */
export const validateRouteDirection = (
  routePath,
  fromLat, fromLong,
  toLat, toLong
) => {
  if (!Array.isArray(routePath) || routePath.length < 2) return true; // can't validate, allow

  let fromMinDist = Infinity, fromIdx = 0;
  let toMinDist = Infinity, toIdx = 0;

  routePath.forEach((point, i) => {
    const fromDist = (point.lat - fromLat) ** 2 + (point.long - fromLong) ** 2;
    const toDist = (point.lat - toLat) ** 2 + (point.long - toLong) ** 2;

    if (fromDist < fromMinDist) { fromMinDist = fromDist; fromIdx = i; }
    if (toDist < toMinDist) { toMinDist = toDist; toIdx = i; }
  });

  return fromIdx <= toIdx; // "from" must appear at or before "to"
};

/**
 * Compute a match score for a ride relative to the user's search points.
 * Lower score = better match.
 *
 * Score = distance(userFrom→closestRoutePoint) + distance(userTo→closestRoutePoint)
 *       + 0.3 × distance(userFrom→rideStart) + 0.3 × distance(userTo→rideEnd)
 *
 * The 0.3 weighting on start/end gives a small bonus to rides whose
 * endpoints are near the user's search points (direct matches).
 */
export const computeRouteMatchScore = (
  routePath,
  rideStartLat, rideStartLong,
  rideEndLat, rideEndLong,
  userFromLat, userFromLong,
  userToLat, userToLong
) => {
  // Distance from user's search points to ride's actual start/end
  const startDist = haversineKm(userFromLat, userFromLong, rideStartLat, rideStartLong);
  const endDist = haversineKm(userToLat, userToLong, rideEndLat, rideEndLong);

  // Distance from user's search points to the closest point on the route
  let fromRouteMin = Infinity;
  let toRouteMin = Infinity;

  if (Array.isArray(routePath) && routePath.length > 0) {
    for (const point of routePath) {
      const fromDist = haversineKm(userFromLat, userFromLong, point.lat, point.long);
      const toDist = haversineKm(userToLat, userToLong, point.lat, point.long);
      if (fromDist < fromRouteMin) fromRouteMin = fromDist;
      if (toDist < toRouteMin) toRouteMin = toDist;
    }
  } else {
    fromRouteMin = startDist;
    toRouteMin = endDist;
  }

  return fromRouteMin + toRouteMin + 0.3 * startDist + 0.3 * endDist;
};