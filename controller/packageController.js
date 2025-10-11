import axios from "axios";
import Package from "../models/Package.js";
import moment from "moment";


export const savePackage = async (req, res) => {
  try {
    const {
      pickup_lat,
      pickup_long,
      drop_lat,
      drop_long,
    } = req.body;

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const route_path = [];

    // ✅ Step 1: Get route from pickup → drop
    if (pickup_lat && pickup_long && drop_lat && drop_long) {
      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup_lat},${pickup_long}&destination=${drop_lat},${drop_long}&key=${googleApiKey}`;
      const mainResponse = await axios.get(mainUrl);

      const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps;

      if (mainSteps && mainSteps.length) {
        mainSteps.forEach(step => {
          route_path.push({
            lat: step.start_location.lat,
            long: step.start_location.lng
          });
        });
        // Push the final drop location
        route_path.push({ lat: drop_lat, long: drop_long });
      }

      // ✅ Step 2: Add extra 20 km beyond drop point
      const extendDistance = 20; // km
      const earthRadius = 6371; // km

      const newLat =
        drop_lat + (extendDistance / earthRadius) * (180 / Math.PI);
      const newLong =
        drop_long +
        (extendDistance / earthRadius) *
        (180 / Math.PI) /
        Math.cos((drop_lat * Math.PI) / 180);

      // Get route for extended path
      const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${drop_lat},${drop_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
      const extendResponse = await axios.get(extendUrl);

      const extendSteps = extendResponse.data.routes[0]?.legs[0]?.steps;

      if (extendSteps && extendSteps.length) {
        extendSteps.forEach(step => {
          route_path.push({
            lat: step.start_location.lat,
            long: step.start_location.lng
          });
        });
        // Add final extended point
        route_path.push({ lat: newLat, long: newLong });
      }
    }

    // ✅ Step 3: Save package with route_path
    const newPackage = new Package({
      ...req.body,
      route_path,
    });

    const savedPackage = await newPackage.save();

    res.status(200).json({
      status: "success",
      message: "Your package has been successfully published",
      data: savedPackage,
    });
  } catch (error) {
    console.error("Error saving package:", error);
    res.status(500).json({
      status: "fail",
      error: error.message,
    });
  }
};


export const getPackages = async (req, res) => {
  try {
    const {
      pickup_location,
      pickup_lat,
      pickup_long,
      drop_location,
      drop_lat,
      drop_long,
      date_time,
      radius = 20
    } = req.body;

    // 🧩 Step 1: Validate input
    if (!pickup_lat || !pickup_long || !drop_lat || !drop_long || !date_time) {
      return res.status(400).json({
        success: 'fail',
        message: "Please provide pickup_lat, pickup_long, drop_lat, drop_long, and date_time",
      });
    }

    const pickupLat = parseFloat(pickup_lat);
    const pickupLong = parseFloat(pickup_long);
    const dropLat = parseFloat(drop_lat);
    const dropLong = parseFloat(drop_long);

    const range = 0.2; // ~20km lat/long range

    // 🔹 Convert date_time to start and end of day
    const dayStart = moment(date_time).startOf("day").toDate();
    const dayEnd = moment(date_time).endOf("day").toDate();

    // 🧭 Step 2: Search packages within radius of pickup/drop AND same date
    const packages = await Package.find(
      {
        date_time: { $gte: dayStart, $lte: dayEnd },
        $or: [
          // direct pickup → drop match
          {
            $and: [
              { pickup_lat: { $gte: pickupLat - range, $lte: pickupLat + range } },
              { pickup_long: { $gte: pickupLong - range, $lte: pickupLong + range } },
              { drop_lat: { $gte: dropLat - range, $lte: dropLat + range } },
              { drop_long: { $gte: dropLong - range, $lte: dropLong + range } },
              { pickup_location: { $regex: pickup_location, $options: 'i' } },
              { drop_location: { $regex: drop_location, $options: 'i' } }
            ]
          },
          // check if pickup/drop exist somewhere on route_path (future use)
          {
            $and: [
              {
                route_path: {
                  $elemMatch: {
                    lat: { $gte: pickupLat - 0.15, $lte: pickupLat + 0.15 },
                    long: { $gte: pickupLong - 0.15, $lte: pickupLong + 0.15 },
                  },
                },
              },
              {
                route_path: {
                  $elemMatch: {
                    lat: { $gte: dropLat - 0.15, $lte: dropLat + 0.15 },
                    long: { $gte: dropLong - 0.15, $lte: dropLong + 0.15 },
                  },
                },
              },
            ],
          },
        ],
      },
      { route_path: 0 }
    )
      .populate("uid", "first_name last_name phone_number")
      .select("-route_path")
      .sort({ date_time: 1 });

    // 🧩 Step 3: Handle no results
    if (!packages.length) {
      return res.status(200).json({
        status: 'success',
        message: "No packages found for this route on the given date",
        data: [],
      });
    }

    // ✅ Step 4: Success response
    res.status(200).json({
      status: 'success',
      count: packages.length,
      message: "Matching packages found!",
      data: packages,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({
      status: 'fail',
      message: "Internal server error",
      error: error.message,
    });
  }
};
