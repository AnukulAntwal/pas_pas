import moment from "moment-timezone";
import dotenv from "dotenv";
import axios from "axios";
import DeliveryService from "../models/DeliveryService.js";
import {
  extractBlaBlaCarStops,
  filterStopsBetween,
  getCityFromLatLong,
  getRoadStops,
  validateRouteDirection,
  computeRouteMatchScore,
} from "../utils/helper/getCityFromLatLong.js";
dotenv.config();

// export const saveDeliveryService = async (req, res) => {
//   try {
//     const { start_lat, start_long, end_lat, end_long } = req.body;
//     const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
//     let route_path = [];

//     // ✅ Step 1: Generate main route_path using Google Maps Directions API
//     if (start_lat && start_long && end_lat && end_long) {
//       const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${start_lat},${start_long}&destination=${end_lat},${end_long}&key=${googleApiKey}`;
//       const mainResponse = await axios.get(mainUrl);

//       // 🔍 Log API response status for debugging
//       if (mainResponse.data.status !== "OK") {
//         console.error("⚠️ Google Directions API error:", mainResponse.data.status, mainResponse.data.error_message || "");
//       }

//       const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

//       // ✅ Add start point first
//       route_path.push({ lat: start_lat, long: start_long });

//       // Collect route points
//       mainSteps.forEach((step) => {
//         route_path.push({
//           lat: step.start_location.lat,
//           long: step.start_location.lng,
//         });
//       });

//       // Add final destination point
//       route_path.push({ lat: end_lat, long: end_long });

//       // ✅ Step 2: Add 20 km ahead from the destination
//       const extendDistance = 20; // in km
//       const earthRadius = 6371; // Earth radius in km

//       // Calculate new lat/long for 20 km ahead
//       const newLat = end_lat + (extendDistance / earthRadius) * (180 / Math.PI);
//       const newLong =
//         end_long +
//         ((extendDistance / earthRadius) * (180 / Math.PI)) /
//           Math.cos((end_lat * Math.PI) / 180);

//       // Get the extra route from Google Maps API
//       const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${end_lat},${end_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
//       const extendResponse = await axios.get(extendUrl);
//       const extendSteps = extendResponse.data.routes[0]?.legs[0]?.steps || [];
 
//       // Add the extended route steps
//       extendSteps.forEach((step) => {
//         route_path.push({
//           lat: step.start_location.lat,
//           long: step.start_location.lng,
//         });
//       });

//       // Add the final extended point
//       route_path.push({ lat: newLat, long: newLong });

//       console.log(`✅ Route path generated: ${route_path.length} points (${mainSteps.length} from main route, ${extendSteps.length} from extension)`);
//     }
//     const road_stops = await getRoadStops(
//       start_lat, start_long,
//       end_lat, end_long,
//       googleApiKey
//     );
//     const SAMPLE_EVERY = 4; // geocode every 4th point to save API calls
//     const enriched = await Promise.all(
//       route_path.map(async (point, i) => {
//         if (i % SAMPLE_EVERY === 0) {
//           const city = await getCityFromLatLong(
//             point.lat,
//             point.long,
//             googleApiKey,
//           );
//           return { ...point, city };
//         }
//         return { ...point, city: null };
//       }),
//     );

//     // Save with enriched route
//     const newService = new DeliveryService({
//       ...req.body,
//       route_path: enriched,
//       road_stops,
//     });

//     const savedService = await newService.save();

//     res.status(200).json({
//       status: "success",
//       message: "Your service has been successfully published",
//       data: savedService,
//     });
//   } catch (error) {
//     console.error("Error saving delivery service:", error);
//     res.status(500).json({
//       status: "fail",
//       message: error.message,
//       data: [],
//     });
//   }
// };

export const saveDeliveryService = async (req, res) => {
  try {
    const { start_lat, start_long, end_lat, end_long } = req.body;
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    let route_path = [];

    if (start_lat && start_long && end_lat && end_long) {

      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${start_lat},${start_long}&destination=${end_lat},${end_long}&key=${googleApiKey}`;

      const mainResponse = await axios.get(mainUrl);

      if (mainResponse.data.status !== "OK") {
        return res.status(400).json({
          status: "fail",
          message: "Google Directions API error",
        });
      }

      const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

      // ✅ Start point
      route_path.push({ lat: start_lat, long: start_long });

      // ✅ Collect step end locations (better coverage)
      mainSteps.forEach((step) => {
        route_path.push({
          lat: step.end_location.lat,
          long: step.end_location.lng,
        });
      });

      // --------------------------------------------------
      // ✅ CORRECT DIRECTION-BASED EXTENSION (NO EARTH MATH)
      // --------------------------------------------------

      if (route_path.length >= 2) {
        const extendDistanceKm = 20; // how much ahead
        const last = route_path[route_path.length - 1];
        const secondLast = route_path[route_path.length - 2];

        const dx = last.lat - secondLast.lat;
        const dy = last.long - secondLast.long;

        const magnitude = Math.sqrt(dx * dx + dy * dy);

        if (magnitude > 0) {
          const scale = (extendDistanceKm / 111) / magnitude; 
          // 1 degree ≈ 111 km approx

          const newLat = last.lat + dx * scale;
          const newLong = last.long + dy * scale;

          route_path.push({
            lat: newLat,
            long: newLong,
          });
        }
      }

      console.log(`✅ Route path generated: ${route_path.length} points`);
    }

    // ✅ Road stops (keep as is)
    const road_stops = await getRoadStops(
      start_lat,
      start_long,
      end_lat,
      end_long,
      googleApiKey
    );

    // --------------------------------------------------
    // ✅ SMART CITY ENRICHMENT (better logic)
    // --------------------------------------------------

    const SAMPLE_EVERY = 4;

    const enriched = await Promise.all(
      route_path.map(async (point, i) => {
        if (i % SAMPLE_EVERY === 0) {
          const city = await getCityFromLatLong(
            point.lat,
            point.long,
            googleApiKey
          );
          return { ...point, city };
        }
        return { ...point, city: null };
      })
    );

    const dateTimeUTC = new Date(req.body.date_time);
    const newService = new DeliveryService({
      ...req.body,
      route_path: enriched,
      road_stops,
      date_time:dateTimeUTC,
    });

    const savedService = await newService.save();

    res.status(200).json({
      status: "success",
      message: "Your service has been successfully published",
      data: savedService,
    });

  } catch (error) {
    console.error("Error saving delivery service:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};
/**
 * GET /api/delivery-services/search
 * Example:
 * /api/delivery-services/search?from_lat=30.6915&from_long=76.8537&to_lat=30.1290&to_long=77.2674
 */

// export const getServices = async (req, res) => {
//   try {
//     const {
//       start_location,
//       start_lat,
//       start_long,
//       end_location,
//       end_lat,
//       end_long,
//       date_time,
//       radius = 20
//     } = req.body;

//     // 🧩 Step 1: Validate input
//     if (!start_lat || !start_long || !end_lat || !end_long || !date_time) {
//       return res.status(400).json({
//         success: 'fail',
//         message: "Please provide start_lat, start_long, end_lat, end_long, and date_time",
//       });
//     }

//     const startLat = parseFloat(start_lat);
//     const startLong = parseFloat(start_long);
//     const endLat = parseFloat(end_lat);
//     const endLong = parseFloat(end_long);

//     const range = 0.25; // ~20km in lat/long degrees

//     // 🔹 Convert date_time to start and end of day
//     const dayStart = moment(date_time).startOf("day").toDate();
//     const dayEnd = moment(date_time).endOf("day").toDate();

//     // 🧭 Step 2: Search rides within radius of start/end AND on the same date
//     const rides = await DeliveryService.find(
//       {
//         is_available: 1,
//         date_time: { $gte: dayStart, $lte: dayEnd },
//         $or: [
//           // direct start → end match
//           {
//             $and: [
//               { start_lat: { $gte: startLat - range, $lte: startLat + range } },
//               { start_long: { $gte: startLong - range, $lte: startLong + range } },
//               { end_lat: { $gte: endLat - range, $lte: endLat + range } },
//               { end_long: { $gte: endLong - range, $lte: endLong + range } }
//               // { start_location: { $regex: start_location, $options: 'i' } },
//               // { end_location: { $regex: end_location, $options: 'i' } }
//             ]
//           },
//           // check if both start & end exist somewhere on route_path
//           {
//             $and: [
//               {
//                 "route_path": {
//                   $elemMatch: {
//                     lat: { $gte: startLat - 0.15, $lte: startLat + 0.15 },
//                     long: { $gte: startLong - 0.15, $lte: startLong + 0.15 }
//                   }
//                 }
//               },
//               {
//                 "route_path": {
//                   $elemMatch: {
//                     lat: { $gte: endLat - 0.15, $lte: endLat + 0.15 },
//                     long: { $gte: endLong - 0.15, $lte: endLong + 0.15 }
//                   }
//                 }
//               }
//             ]
//           }
//         ]
//       },
//       { route_path: 0 }
//     ).populate('uid', 'first_name last_name email phone_number').populate('booked_by', 'first_name last_name') // ← populate uid with specific user fields
//     .select('-route_path').sort({ date_time: 1 });

//     // 🧩 Step 3: Handle no results
//     if (!rides.length) {
//      res.status(200).json({
//         status: 'success',
//         message: "No transporters are available at the moment",
//         data: [],
//       });
//     }

//     // ✅ Step 4: Success response
//     res.status(200).json({
//       status: 'success',
//       count: rides.length,
//       message: "Matching rides found!",
//       data: rides,
//     });
//   } catch (error) {
//     console.error("Error fetching services:", error);
//     res.status(500).json({
//       status: 'fail',
//       message: "Internal server error",
//       data:[],
//     });
//   }
// };

export const getServices = async (req, res) => {
  try {
    const { start_lat, start_long, end_lat, end_long, date_time } =
      req.body || {};
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!start_lat || !start_long || !end_lat || !end_long || !date_time) {
      return res.status(400).json({
        status: "fail",
        message:
          "Provide start_lat, start_long, end_lat, end_long, and date_time",
        data: [],
      });
    }

    const startLat = parseFloat(start_lat);
    const startLong = parseFloat(start_long);
    const endLat = parseFloat(end_lat);
    const endLong = parseFloat(end_long);

    // ✅ Tighter radii for more accurate matching
    const directRange = 0.09; // ~10 km for direct start/end match
    const routeRange = 0.15;  // ~15 km for route_path match

    // ✅ Date range: selected date → next 7 days
    const searchDate = moment(date_time, "YYYY-MM-DD", true);
    const dayStart = searchDate.clone().startOf("day").toDate();
    const dayEnd = searchDate.clone().add(7, "days").endOf("day").toDate();
    console.log(dayStart);
    console.log(dayEnd);
    
    
    // ✅ Fetch WITH route_path so we can validate direction post-query
    const rides = await DeliveryService.find({
      is_available: 1,
      is_completed: 0,
      date_time: { $gte: dayStart, $lte: dayEnd },
      $or: [
        // ✅ Direct start → end match (tight radius)
        {
          $and: [
            { start_lat: { $gte: startLat - directRange, $lte: startLat + directRange } },
            { start_long: { $gte: startLong - directRange, $lte: startLong + directRange } },
            { end_lat: { $gte: endLat - directRange, $lte: endLat + directRange } },
            { end_long: { $gte: endLong - directRange, $lte: endLong + directRange } },
          ],
        },
        // ✅ Route path match (moderate radius)
        {
          $and: [
            {
              route_path: {
                $elemMatch: {
                  lat: { $gte: startLat - routeRange, $lte: startLat + routeRange },
                  long: { $gte: startLong - routeRange, $lte: startLong + routeRange },
                },
              },
            },
            {
              route_path: {
                $elemMatch: {
                  lat: { $gte: endLat - routeRange, $lte: endLat + routeRange },
                  long: { $gte: endLong - routeRange, $lte: endLong + routeRange },
                },
              },
            },
          ],
        },
      ],
    })
      .populate("uid", "first_name last_name email phone_number")
      .populate("booked_by", "first_name last_name")
      .sort({ date_time: 1 });
    
    if (!rides.length) {
      return res.status(200).json({
        status: "success",
        message: "No transporters available from selected date to next 7 days",
        data: [],
      });
    }

    // ✅ Post-query: validate direction + compute match score
    const validatedRides = rides
      .map((ride) => {
        const rideObj = ride.toObject();

        // 🔒 Direction check: user's "from" must appear BEFORE "to" on the route
        const isValidDirection = validateRouteDirection(
          rideObj.route_path,
          startLat, startLong,
          endLat, endLong
        );
        if (!isValidDirection) return null; // ❌ wrong direction, skip

        // 📊 Compute match score (lower = better)
        rideObj._matchScore = computeRouteMatchScore(
          rideObj.route_path,
          rideObj.start_lat, rideObj.start_long,
          rideObj.end_lat, rideObj.end_long,
          startLat, startLong,
          endLat, endLong
        );

        // ✅ Compute stops between from → to
        rideObj.stops_between = filterStopsBetween(
          rideObj.road_stops,
          startLat, startLong,
          endLat, endLong
        );

        // 🧹 Remove internal fields from response
        delete rideObj.road_stops;
        delete rideObj.route_path;

        return rideObj;
      })
      .filter(Boolean) // remove null (wrong direction)
      .sort((a, b) => a._matchScore - b._matchScore); // best matches first

    // 🧹 Remove _matchScore from final response
    validatedRides.forEach((r) => delete r._matchScore);

    const formatToIST = (date) =>
      moment(date).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A");

    validatedRides.forEach((ride) => {
      ride.date_time = formatToIST(ride.date_time);
      ride.createdAt = formatToIST(ride.createdAt);
      ride.updatedAt = formatToIST(ride.updatedAt);
      ride.expiresAt = formatToIST(ride.expiresAt);
    });
    if (!validatedRides.length) {
      return res.status(200).json({
        status: "success",
        message: "No transporters available on this route",
        data: [],
      });
    }

    return res.status(200).json({
      status: "success",
      count: validatedRides.length,
      message: "Matching rides found!",
      data: validatedRides,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
      data: [],
    });
  }
};

export const deleteDeliveryService = async (req, res) => {
  try {
    const { service_id } = req.query; // id aayegi from URL params

    // Check if service exists
    const service = await DeliveryService.findById(service_id);
    if (!service) {
      return res.status(404).json({
        status: "fail",
        message: "Service not found",
        data: [],
      });
    }

    // Delete the service
    const deletedService = await DeliveryService.findByIdAndDelete(service_id);

    return res.status(200).json({
      status: "success",
      message: "Service deleted successfully",
      data: [],
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
      data: [],
    });
  }
};

export const getDeliveryServiceDetails = async (req, res) => {
  try {
    const { service_id } = req.query;

    if (!service_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing service_id in query",
        data: [],
      });
    }

    const service = await DeliveryService.findById(service_id);

    if (!service) {
      return res.status(404).json({
        status: "fail",
        message: "Delivery service not found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Delivery service details fetched successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error fetching delivery service:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};
