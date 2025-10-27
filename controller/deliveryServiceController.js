import moment from "moment";   // ← Add this
import dotenv from "dotenv";
import axios from "axios";
import DeliveryService from "../models/DeliveryService.js";
dotenv.config();

// export const saveDeliveryService = async (req, res) => {
//   try {
//     const newService = new DeliveryService(req.body);
//     const savedService = await newService.save();

//     res.status(201).json({
//       status: 'success',
//       message: "Your service has been successfully published",
//       data: savedService,
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 'fail',
//       error: error.message,
//     });
//   }
// };

export const saveDeliveryService = async (req, res) => {
  try {
    const { start_lat, start_long, end_lat, end_long } = req.body;

    // let route_path = [];

    //  if (start_lat && start_long && end_lat && end_long) {
    //   const googleApiKey = process.env.GOOGLE_MAPS_API_KEY; // make sure you have your API key in env

    //   const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start_lat},${start_long}&destination=${end_lat},${end_long}&key=${googleApiKey}`;

    //   const response = await axios.get(url);

    //   const steps = response.data.routes[0]?.legs[0]?.steps;

    //   if (steps && steps.length) {
    //     // loop through steps and get lat/long
    //     steps.forEach(step => {
    //       // each step has start_location & end_location
    //       route_path.push({
    //         lat: step.start_location.lat,
    //         long: step.start_location.lng
    //       });
    //     });

    //     // add final destination point
    //     route_path.push({ lat: end_lat, long: end_long });
    //   }
    // }
    // ✅ Step 1: Generate route_path using Google Maps Directions API
      if (start_lat && start_long && end_lat && end_long) {
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      const route_path = [];

      // 🧭 1️⃣ Get main route (start → end)
      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${start_lat},${start_long}&destination=${end_lat},${end_long}&key=${googleApiKey}`;
      const mainResponse = await axios.get(mainUrl);

      const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps;

      if (mainSteps && mainSteps.length) {
        mainSteps.forEach(step => {
          route_path.push({
            lat: step.start_location.lat,
            long: step.start_location.lng
          });
        });
        route_path.push({ lat: end_lat, long: end_long });
      }

      // 📍 2️⃣ Get extended route (from end_location → +20km ahead)
      const extendDistance = 20; // km
      const earthRadius = 6371; // km
      const extendBearing = 90; // East (can adjust depending on direction)

      // calculate new coordinates ~20km ahead of end location
      const newLat =
        end_lat + (extendDistance / earthRadius) * (180 / Math.PI);
      const newLong =
        end_long +
        (extendDistance / earthRadius) *
          (180 / Math.PI) /
          Math.cos((end_lat * Math.PI) / 180);

      // get route for extended path (end → extended point)
      const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${end_lat},${end_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
      const extendResponse = await axios.get(extendUrl);

      const extendSteps = extendResponse.data.routes[0]?.legs[0]?.steps;

      if (extendSteps && extendSteps.length) {
        extendSteps.forEach(step => {
          route_path.push({
            lat: step.start_location.lat,
            long: step.start_location.lng
          });
        });
        route_path.push({ lat: newLat, long: newLong });
      }

      // ✅ Now route_path contains:
      //    - Start → End route points
      //    - + Extended 20 km route points beyond end location
    }


    // ✅ Step 2: Save the service including route_path
    const newService = new DeliveryService({
      ...req.body,
      route_path
    });

    const savedService = await newService.save();

    res.status(200).json({
      status: 'success',
      message: "Your service has been successfully published",
      data: savedService,
    });
  } catch (error) {
    console.error("Error saving service:", error);
    res.status(500).json({
      status: 'fail',
      error: error.message,
    });
  }
};


/**
 * GET /api/delivery-services/search
 * Example:
 * /api/delivery-services/search?from_lat=30.6915&from_long=76.8537&to_lat=30.1290&to_long=77.2674
 */


export const getServices = async (req, res) => {
  try {
    const {
      start_location,
      start_lat,
      start_long,
      end_location,
      end_lat,
      end_long,
      date_time,
      radius = 20
    } = req.body;

    // 🧩 Step 1: Validate input
    if (!start_lat || !start_long || !end_lat || !end_long || !date_time) {
      return res.status(400).json({
        success: 'fail',
        message: "Please provide start_lat, start_long, end_lat, end_long, and date_time",
      });
    }

    const startLat = parseFloat(start_lat);
    const startLong = parseFloat(start_long);
    const endLat = parseFloat(end_lat);
    const endLong = parseFloat(end_long);

    const range = 0.2; // ~20km in lat/long degrees

    // 🔹 Convert date_time to start and end of day
    const dayStart = moment(date_time).startOf("day").toDate();
    const dayEnd = moment(date_time).endOf("day").toDate();

    // 🧭 Step 2: Search rides within radius of start/end AND on the same date
    const rides = await DeliveryService.find(
      {
        date_time: { $gte: dayStart, $lte: dayEnd },
        $or: [
          // direct start → end match
          {
            $and: [
              { start_lat: { $gte: startLat - range, $lte: startLat + range } },
              { start_long: { $gte: startLong - range, $lte: startLong + range } },
              { end_lat: { $gte: endLat - range, $lte: endLat + range } },
              { end_long: { $gte: endLong - range, $lte: endLong + range } },
              { start_location: { $regex: start_location, $options: 'i' } }, 
              { end_location: { $regex: end_location, $options: 'i' } }   
            ]
          },
          // check if both start & end exist somewhere on route_path
          {
            $and: [
              { 
                "route_path": { 
                  $elemMatch: { 
                    lat: { $gte: startLat - 0.15, $lte: startLat + 0.15 }, 
                    long: { $gte: startLong - 0.15, $lte: startLong + 0.15 } 
                  } 
                }
              },
              { 
                "route_path": { 
                  $elemMatch: { 
                    lat: { $gte: endLat - 0.15, $lte: endLat + 0.15 }, 
                    long: { $gte: endLong - 0.15, $lte: endLong + 0.15 } 
                  } 
                }
              }
            ]
          }
        ]
      },
      { route_path: 0 } 
    ).populate('uid', 'first_name last_name email phone_number') // ← populate uid with specific user fields
    .select('-route_path').sort({ date_time: 1 });

    // 🧩 Step 3: Handle no results
    if (!rides.length) {
     res.status(200).json({
        status: 'success',
        message: "No rides found for this route on the given date",
        data: [],
      });
    }

    // ✅ Step 4: Success response
    res.status(200).json({
      status: 'success',
      count: rides.length,
      message: "Matching rides found!",
      data: rides,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({
      status: 'fail',
      message: "Internal server error",
      data:[],
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
        status: 'fail',
        message: 'Service not found',
        data:[]
      });
    }

    // Delete the service
  const deletedService =   await DeliveryService.findByIdAndDelete(service_id);

    return res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully',
      data:deletedService
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Internal Server Error',
      data:[],
    });
  }
};
