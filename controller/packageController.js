import axios from "axios";
import Package from "../models/Package.js";
import moment from "moment";


export const savePackage = async (req, res) => {
  try {
    const { pickup_lat, pickup_long, drop_lat, drop_long } = req.body;
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const route_path = [];

    if (pickup_lat && pickup_long && drop_lat && drop_long) {
      // 1️⃣ Get main route steps
      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup_lat},${pickup_long}&destination=${drop_lat},${drop_long}&key=${googleApiKey}`;
      const mainResponse = await axios.get(mainUrl);
      const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

      mainSteps.forEach(step => {
        route_path.push({ lat: step.start_location.lat, long: step.start_location.lng });
      });
      route_path.push({ lat: drop_lat, long: drop_long }); // final drop point

      // 2️⃣ Add extra 20 km beyond drop
      const extendDistance = 20; // km
      const earthRadius = 6371; // km
      const newLat = drop_lat + (extendDistance / earthRadius) * (180 / Math.PI);
      const newLong = drop_long + (extendDistance / earthRadius) * (180 / Math.PI) / Math.cos((drop_lat * Math.PI) / 180);

      // Extended route steps
      const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${drop_lat},${drop_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
      const extendResponse = await axios.get(extendUrl);
      const extendSteps = extendResponse.data.routes[0]?.legs[0]?.steps || [];

      extendSteps.forEach(step => {
        route_path.push({ lat: step.start_location.lat, long: step.start_location.lng });
      });
      route_path.push({ lat: newLat, long: newLong });
    }

    // 3️⃣ Save package
    const newPackage = new Package({ ...req.body, route_path });
    const savedPackage = await newPackage.save();

    res.status(200).json({
      status: "success",
      message: "Package published successfully",
      data: savedPackage,
    });
  } catch (error) {
    console.error("Error saving package:", error);
    res.status(500).json({ status: "fail", message: error.message, data:[] });
  }
};



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

    const range = 0.25; // ~25km range to include in-between stops
    const dayStart = moment(date_time).startOf("day").toDate();
    const dayEnd = moment(date_time).endOf("day").toDate();

    const packages = await Package.find({
      date_time: { $gte: dayStart, $lte: dayEnd },
      $or: [
        // 1️⃣ Direct pickup → drop match
        {
          $and: [
            { pickup_lat: { $gte: pickup_lat - range, $lte: pickup_lat + range } },
            { pickup_long: { $gte: pickup_long - range, $lte: pickup_long + range } },
            { drop_lat: { $gte: drop_lat - range, $lte: drop_lat + range } },
            { drop_long: { $gte: drop_long - range, $lte: drop_long + range } }
          ]
        },
        // 2️⃣ Check if pickup/drop exist somewhere on route_path
        {
          $and: [
            { route_path: { $elemMatch: { lat: { $gte: pickup_lat - range, $lte: pickup_lat + range }, long: { $gte: pickup_long - range, $lte: pickup_long + range } } } },
            { route_path: { $elemMatch: { lat: { $gte: drop_lat - range, $lte: drop_lat + range }, long: { $gte: drop_long - range, $lte: drop_long + range } } } }
          ]
        }
      ]
    })
    .populate("uid", "first_name last_name phone_number")
    .select("-route_path")
    .sort({ date_time: 1 });

    if (!packages.length) {
      return res.status(200).json({ status: 'success', message: "No packages found", data: [] });
    }

    res.status(200).json({
      status: 'success',
      count: packages.length,
      message: "Matching packages found!",
      data: packages,
    });

  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ status: 'fail', message: error.message,data:[] });
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
      data:deletePackage
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

export const updatePackage = async (req, res) => {
  try {
    const { package_id } = req.query;
    const { pickup_lat, pickup_long, drop_lat, drop_long, ...otherFields } = req.body || {};

    if (!package_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing package_id in query",
      });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    let route_path = [];

    // ✅ Recalculate route only if pickup/drop coordinates are updated
    if (pickup_lat && pickup_long && drop_lat && drop_long) {
      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup_lat},${pickup_long}&destination=${drop_lat},${drop_long}&key=${googleApiKey}`;
      const mainResponse = await axios.get(mainUrl);
      const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

      mainSteps.forEach((step) => {
        route_path.push({
          lat: step.start_location.lat,
          long: step.start_location.lng,
        });
      });
      route_path.push({ lat: drop_lat, long: drop_long });

      // ➕ Extend route by 20 km beyond drop
      const extendDistance = 20;
      const earthRadius = 6371;
      const newLat = drop_lat + (extendDistance / earthRadius) * (180 / Math.PI);
      const newLong =
        drop_long +
        ((extendDistance / earthRadius) * (180 / Math.PI)) /
          Math.cos((drop_lat * Math.PI) / 180);

      const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${drop_lat},${drop_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
      const extendResponse = await axios.get(extendUrl);
      const extendSteps = extendResponse.data.routes[0]?.legs[0]?.steps || [];

      extendSteps.forEach((step) => {
        route_path.push({
          lat: step.start_location.lat,
          long: step.start_location.lng,
        });
      });
      route_path.push({ lat: newLat, long: newLong });
    }

    // ✅ Prepare dynamic update object
    const updateData = {
      ...otherFields, // e.g. package_type, price, etc.
      ...(pickup_lat && { pickup_lat }),
      ...(pickup_long && { pickup_long }),
      ...(drop_lat && { drop_lat }),
      ...(drop_long && { drop_long }),
      ...(route_path.length > 0 && { route_path }),
    };

    console.log("🟢 Update Data:", updateData);

    // ✅ Perform update
    const updatedPackage = await Package.findByIdAndUpdate(package_id, updateData, {
      new: true,
    });

    if (!updatedPackage) {
      return res.status(404).json({
        status: "fail",
        message: "Package not found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Package updated successfully",
      data: updatedPackage,
    });
  } catch (error) {
    console.error("❌ Error updating package:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};

