import axios from "axios";
import Package from "../models/Package.js";
import moment from "moment-timezone";
import {
  getRoadStops,
  filterStopsBetween,
  validateRouteDirection,
  computeRouteMatchScore,
} from "../utils/helper/getCityFromLatLong.js";


// export const savePackage = async (req, res) => {
//   try {
//     const { pickup_lat, pickup_long, drop_lat, drop_long } = req.body;
//     const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
//     const route_path = [];

//     if (pickup_lat && pickup_long && drop_lat && drop_long) {
//       // 1️⃣ Get main route steps
//       const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup_lat},${pickup_long}&destination=${drop_lat},${drop_long}&key=${googleApiKey}`;
//       const mainResponse = await axios.get(mainUrl);

//       // 🔍 Log API response status for debugging
//       if (mainResponse.data.status !== "OK") {
//         console.error("⚠️ Google Directions API error (package):", mainResponse.data.status, mainResponse.data.error_message || "");
//       }

//       const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

//       // ✅ Add pickup point first
//       route_path.push({ lat: pickup_lat, long: pickup_long });

//       mainSteps.forEach(step => {
//         route_path.push({ lat: step.start_location.lat, long: step.start_location.lng });
//       });
//       route_path.push({ lat: drop_lat, long: drop_long }); // final drop point

//       // 2️⃣ Add extra 20 km beyond drop
//       const extendDistance = 20; // km
//       const earthRadius = 6371; // km
//       const newLat = drop_lat + (extendDistance / earthRadius) * (180 / Math.PI);
//       const newLong = drop_long + (extendDistance / earthRadius) * (180 / Math.PI) / Math.cos((drop_lat * Math.PI) / 180);

//       // Extended route steps
//       const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${drop_lat},${drop_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
//       const extendResponse = await axios.get(extendUrl);
//       const extendSteps = extendResponse.data.routes[0]?.legs[0]?.steps || [];

//       extendSteps.forEach(step => {
//         route_path.push({ lat: step.start_location.lat, long: step.start_location.lng });
//       });
//       route_path.push({ lat: newLat, long: newLong });

//       console.log(`✅ Package route path: ${route_path.length} points (${mainSteps.length} from main route, ${extendSteps.length} from extension)`);
//     }

//     // ✅ Generate road_stops for intermediate city stops
//     const road_stops = await getRoadStops(
//       pickup_lat, pickup_long,
//       drop_lat, drop_long,
//       googleApiKey
//     );

//     // 3️⃣ Save package with route_path and road_stops
//     const newPackage = new Package({ ...req.body, route_path, road_stops });
//     const savedPackage = await newPackage.save();

//     res.status(200).json({
//       status: "success",
//       message: "Package published successfully",
//       data: savedPackage,
//     });
//   } catch (error) {
//     console.error("Error saving package:", error);
//     res.status(500).json({ status: "fail", message: error.message, data:[] });
//   }
// };

export const savePackage = async (req, res) => {
  try {
    const { pickup_lat, pickup_long, drop_lat, drop_long } = req.body;
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const route_path = [];

    if (pickup_lat && pickup_long && drop_lat && drop_long) {

      // 1️⃣ Get main route from Google Directions
      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup_lat},${pickup_long}&destination=${drop_lat},${drop_long}&key=${googleApiKey}`;
      const mainResponse = await axios.get(mainUrl);

      if (mainResponse.data.status !== "OK") {
        return res.status(400).json({
          status: "fail",
          message: "Google Directions API error",
        });
      }

      const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

      // ✅ Add pickup first
      route_path.push({ lat: pickup_lat, long: pickup_long });

      // ✅ Use step.end_location for better accuracy
      mainSteps.forEach(step => {
        route_path.push({
          lat: step.end_location.lat,
          long: step.end_location.lng
        });
      });

      // --------------------------------------------------
      // ✅ Direction-Based Extension (NO Earth Radius)
      // --------------------------------------------------

      if (route_path.length >= 2) {

        const extendDistanceKm = 20; // extend 20km ahead

        const last = route_path[route_path.length - 1];
        const secondLast = route_path[route_path.length - 2];

        const dx = last.lat - secondLast.lat;
        const dy = last.long - secondLast.long;

        const magnitude = Math.sqrt(dx * dx + dy * dy);

        if (magnitude > 0) {

          // 1 degree ≈ 111km approx
          const scale = (extendDistanceKm / 111) / magnitude;

          const newLat = last.lat + dx * scale;
          const newLong = last.long + dy * scale;

          route_path.push({
            lat: newLat,
            long: newLong,
          });
        }
      }

      console.log(`✅ Package route path generated: ${route_path.length} points`);
    }

    // ✅ Generate road stops
    const road_stops = await getRoadStops(
      pickup_lat,
      pickup_long,
      drop_lat,
      drop_long,
      googleApiKey
    );

    // 3️⃣ Save package
     const dateTimeUTC = new Date(req.body.date_time);
    const newPackage = new Package({
      ...req.body,
      route_path,
      road_stops,
      date_time: dateTimeUTC
    });

    const savedPackage = await newPackage.save();

    res.status(200).json({
      status: "success",
      message: "Package published successfully",
      data: savedPackage,
    });

  } catch (error) {
    console.error("Error saving package:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};

// export const getPackages = async (req, res) => {
//   try {
//     const {
//       pickup_lat, pickup_long, drop_lat, drop_long, date_time
//     } = req.body;

//     if (!pickup_lat || !pickup_long || !drop_lat || !drop_long || !date_time) {
//       return res.status(400).json({
//         status: 'fail',
//         message: "Provide pickup_lat, pickup_long, drop_lat, drop_long, and date_time",
//         data:[]
//       });
//     }

//     const range = 0.25; // ~25km range to include in-between stops
//     const dayStart = moment(date_time).startOf("day").toDate();
//     const dayEnd = moment(date_time).endOf("day").toDate();

//     const packages = await Package.find({
//       is_available: 1,
//       date_time: { $gte: dayStart, $lte: dayEnd },
//       $or: [
//         // 1️⃣ Direct pickup → drop match
//         {
//           $and: [
//             { pickup_lat: { $gte: pickup_lat - range, $lte: pickup_lat + range } },
//             { pickup_long: { $gte: pickup_long - range, $lte: pickup_long + range } },
//             { drop_lat: { $gte: drop_lat - range, $lte: drop_lat + range } },
//             { drop_long: { $gte: drop_long - range, $lte: drop_long + range } }
//           ]
//         },
//         // 2️⃣ Check if pickup/drop exist somewhere on route_path
//         {
//           $and: [
//             { route_path: { $elemMatch: { lat: { $gte: pickup_lat - range, $lte: pickup_lat + range }, long: { $gte: pickup_long - range, $lte: pickup_long + range } } } },
//             { route_path: { $elemMatch: { lat: { $gte: drop_lat - range, $lte: drop_lat + range }, long: { $gte: drop_long - range, $lte: drop_long + range } } } }
//           ]
//         }
//       ]
//     })
//     .populate("uid", "first_name last_name phone_number").populate('booked_by', 'first_name last_name')
//     .select("-route_path")
//     .sort({ date_time: 1 });

//     if (!packages.length) {
//       return res.status(200).json({ status: 'success', message: "No parcel were found on this route", data: [] });
//     }

//     res.status(200).json({
//       status: 'success',
//       count: packages.length,
//       message: "Matching parcel found!",
//       data: packages,
//     });

//   } catch (error) {
//     console.error("Error fetching packages:", error);
//     res.status(500).json({ status: 'fail', message: error.message,data:[] });
//   }
// };

export const getPackages = async (req, res) => {
  try {
    const {
      pickup_lat, pickup_long, drop_lat, drop_long, date_time
    } = req.body;

    if (!pickup_lat || !pickup_long || !drop_lat || !drop_long || !date_time) {
      return res.status(400).json({
        status: 'fail',
        message: "Provide pickup_lat, pickup_long, drop_lat, drop_long, and date_time",
        data:[]
      });
    }

    const pickupLat = parseFloat(pickup_lat);
    const pickupLong = parseFloat(pickup_long);
    const dropLat = parseFloat(drop_lat);
    const dropLong = parseFloat(drop_long);

    // ✅ Tighter radii for more accurate matching
    const directRange = 0.09; // ~10 km for direct pickup/drop match
    const routeRange = 0.15;  // ~15 km for route_path match

    // ✅ Date range: selected date → next 7 days
   const searchDate = moment.tz(
     date_time,
     "YYYY-MM-DD HH:mm:ss",
     "Asia/Kolkata"
   );
   if (!searchDate.isValid()) {
  return res.status(400).json({
    status: "fail",
    message: "Invalid date format. Use YYYY-MM-DD HH:mm:ss",
    data: [],
  });
}
  const dayStart = searchDate.clone().startOf("day").utc().toDate();
const dayEnd = searchDate.clone().add(7, "days").endOf("day").utc().toDate();

    // ✅ Fetch WITH route_path so we can validate direction post-query
    const packages = await Package.find({
      is_available: 1,
      date_time: { $gte: dayStart, $lte: dayEnd },
      $or: [
        // 1️⃣ Direct pickup → drop match (tight radius)
        {
          $and: [
            { pickup_lat: { $gte: pickupLat - directRange, $lte: pickupLat + directRange } },
            { pickup_long: { $gte: pickupLong - directRange, $lte: pickupLong + directRange } },
            { drop_lat: { $gte: dropLat - directRange, $lte: dropLat + directRange } },
            { drop_long: { $gte: dropLong - directRange, $lte: dropLong + directRange } }
          ]
        },
        // 2️⃣ Route path match (moderate radius)
        {
          $and: [
            {
              route_path: {
                $elemMatch: {
                  lat: { $gte: pickupLat - routeRange, $lte: pickupLat + routeRange },
                  long: { $gte: pickupLong - routeRange, $lte: pickupLong + routeRange }
                }
              }
            },
            {
              route_path: {
                $elemMatch: {
                  lat: { $gte: dropLat - routeRange, $lte: dropLat + routeRange },
                  long: { $gte: dropLong - routeRange, $lte: dropLong + routeRange }
                }
              }
            }
          ]
        }
      ]
    })
    .populate("uid", "first_name last_name phone_number")
    .populate('booked_by', 'first_name last_name')
    .sort({ date_time: 1 });

    if (!packages.length) {
      return res.status(200).json({
        status: 'success',
        message: "No parcel found from selected date to next 7 days",
        data: []
      });
    }

    // ✅ Post-query: validate direction + compute match score
    const validatedPackages = packages
      .map((pkg) => {
        const pkgObj = pkg.toObject();

        // 🔒 Direction check: user's "from" must appear BEFORE "to" on the route
        const isValidDirection = validateRouteDirection(
          pkgObj.route_path,
          pickupLat, pickupLong,
          dropLat, dropLong
        );
        if (!isValidDirection) return null; // ❌ wrong direction, skip

        // 📊 Compute match score (lower = better)
        pkgObj._matchScore = computeRouteMatchScore(
          pkgObj.route_path,
          pkgObj.pickup_lat, pkgObj.pickup_long,
          pkgObj.drop_lat, pkgObj.drop_long,
          pickupLat, pickupLong,
          dropLat, dropLong
        );

        // ✅ Compute stops between pickup → drop
        pkgObj.stops_between = filterStopsBetween(
          pkgObj.road_stops,
          pickupLat, pickupLong,
          dropLat, dropLong
        );

        // 🧹 Remove internal fields from response
        delete pkgObj.road_stops;
        delete pkgObj.route_path;

        return pkgObj;
      })
      .filter(Boolean) // remove null (wrong direction)
      .sort((a, b) => a._matchScore - b._matchScore); // best matches first

    // 🧹 Remove _matchScore from final response
    validatedPackages.forEach((p) => delete p._matchScore);
      const formatToIST = (date) =>
      moment(date).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A");

    validatedPackages.forEach((pkg) => {
      pkg.date_time = formatToIST(pkg.date_time);
      pkg.createdAt = formatToIST(pkg.createdAt);
      pkg.updatedAt = formatToIST(pkg.updatedAt);

      if (pkg.expiresAt) {
        pkg.expiresAt = formatToIST(pkg.expiresAt);
      }
    });
    if (!validatedPackages.length) {
      return res.status(200).json({
        status: 'success',
        message: "No parcel found on this route",
        data: []
      });
    }

    res.status(200).json({
      status: 'success',
      count: validatedPackages.length,
      date_range: {
        from: dayStart,
        to: dayEnd
      },
      message: "Matching parcel found!",
      data: validatedPackages,
    });

  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ status: 'fail', message: error.message, data:[] });
  }
};

export const deletePackage = async (req, res) => {
  try {
    // 🔹 Get package_id from query (example: ?package_id=abc123)
    const { package_id } = req.query;

    if (!package_id) {
      return res.status(400).json({
        status: "fail",
        message: "package_id is required",
        data:[]
      });
    }

    // 🔹 Check if package exists
    const packageData = await Package.findById(package_id);

    if (!packageData) {
      return res.status(404).json({
        status: "fail",
        message: "Package not found",
        data:[]
      });
    }

    // 🔹 Delete the package
    const deletePackage =  await Package.findByIdAndDelete(package_id);

    return res.status(200).json({
      status: "success",
      message: "Package deleted successfully",
      data:[]
    });
  } catch (error) {
    console.error("❌ Error deleting package:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
      error: error.message,
      data:[]
    });
  }
};

// get package details for user edits 

export const getPackageDetail = async (req, res) => {
  try {
    const { package_id } = req.query; // 📦 Package ID from URL

    const packageData = await Package.findById(package_id);

    if (!packageData) {
      return res.status(404).json({
        status: "fail",
        message: "Package not found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Package details fetched successfully",
      data: packageData,
    });
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};
