import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Package from "../models/Package.js";
import dotenv from "dotenv";
import axios from "axios";
import DeliveryService from "../models/DeliveryService.js";
import { getNextConversationId } from "../utils/getNextId.js";
import Notification from "../models/Notification.js";
import moment from "moment";
dotenv.config();

export const bookOrCancel = async (req, res) => {
  try {
    const {
      reference_id,
      user_id,
      type,
      is_available,
      message,
      cancel_reason,
    } = req.body;

      if ([reference_id, user_id, type, is_available].some(v => v === undefined)) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields (reference_id, user_id, type, is_available)",
        data: [],
      });
    }

  let bookedFor;
      if(type === 0){
        bookedFor = 'package';
      }else{
        bookedFor = 'ride';
      }
    // ✅ Select model based on type
    let Model;
    if (type === 0) Model = Package;
    else if (type === 1) Model = DeliveryService;
    else {
      return res.status(400).json({
        status: "fail",
        message: "Invalid type (must be package or service)",
        data: [],
      });
    }

    // ✅ Fetch record
    const record = await Model.findById(reference_id);
    if (!record) {
      return res.status(404).json({
        status: "fail",
        message: `${bookedFor} not found`,
        data: [],
      });
    }

    let chatResponse = null;

    // ✅ BOOKING LOGIC
    if (is_available === 0) {
      if (record.is_available === 0) {
        return res.status(400).json({
          status: "fail",
          message: "Already booked by another user",
          data: [],
        });
      }

      record.booking_type = "Booked";
      record.is_available = 0;
      record.booked_by = user_id;

      // 🟢 Create chat only if message provided
      if (message && message.trim() !== "") {
        const receiver_id =
          record.uid?.toString() === user_id.toString()
            ? record.booked_by
            : record.uid;

        if (receiver_id) {
          const conversation_id = await getNextConversationId();

          // Create Chat
          await Chat.create({
            conversation_id,
            conversation_for: type,
            reference_id,
            sender_id: user_id,
            receiver_id,
            message,
            unread_count: 1,
            is_read: 0,
          });

          // Create Notification
          await Notification.create({
            sender_id: user_id,
            receiver_id,
            conversation_id,
            reference_id,
            message_text: message,
            type: "message",
          });

          // 🧩 Fetch contact details
          const receiver = await User.findById(receiver_id)
            .select("first_name last_name phone_number")
            .lean();

          // 🧩 Fetch conversation logs
          const allChats = await Chat.find({ conversation_id })
            .sort({ createdAt: -1 })
            .lean();

          const conversation_log = allChats.map((c) => ({
            conversation: c.message,
            conversation_date: moment(c.createdAt).format(
              "YYYY-MM-DD HH:mm:ss"
            ),
            conversation_id: c.conversation_id,
            direction:
              c.sender_id.toString() === user_id.toString()
                ? "outbound"
                : "inbound",
            is_read: c.is_read,
          }));

          // 🧩 Build formatted Chat object
          chatResponse = {
            contact_details: {
              id: receiver._id,
              user_name: `${receiver.first_name || ""} ${
                receiver.last_name || ""
              }`.trim(),
              contact_number: receiver.phone_number || "",
              reference_id: record._id,
            },
            reference_details: {
              _id: record._id,
              reference_id: record._id,
              reference_type: type,
              pickup_location:
                record.pickup_location || record.start_location || "",
              drop_location:
                record.drop_location || record.end_location || "",
              price: record.price || "",
            },
            conversation_log,
          };
        }
      }
    }

    // 🔴 CANCELLATION LOGIC
    else if (is_available === 1) {
      if (record.booked_by?.toString() !== user_id.toString()) {
        return res.status(403).json({
          status: "fail",
          message: "You can only cancel your own booking",
          data: [],
        });
      }

      record.booking_type = "Cancelled";
      record.is_available = 1;
      record.booked_by = null;

      // Only update reason (no chat creation)
      if (cancel_reason && cancel_reason.trim() !== "") {
        record.cancel_reason = cancel_reason;
      }
    }

    await record.save();

    // ✅ Fetch user details
    const user = await User.findById(user_id)
      .select("first_name last_name phone_number")
      .lean();

    // ✅ Fetch reference details
    const referenceDetails = await Model.findById(reference_id)
      .select(
        type === 0
          ? "start_location end_location date_time price"
          : "pickup_address delivery_address package_type weight price"
      )
      .lean();
    
    // ✅ Final Response
    return res.status(200).json({
      status: "success",
      message:
        is_available === 0
          ? `${bookedFor} booked successfully`
          : `${bookedFor} booking cancelled successfully`,
      data: {
        reference_id: record._id,
        type,
        booking_type: record.booking_type,
        is_available: record.is_available,
        cancel_reason: record.cancel_reason || null,
        booked_by: user || null,
        reference_details: referenceDetails || null,
        Chat: chatResponse || null,
      },
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};


export const getMyBookings = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        status: "fail",
        message: "user_id is required",
        data: [],
      });
    }

    // ⏰ Current time → Next 24 hours
    const startOfDay = moment().startOf("day").toDate();
    const next24Hours = moment().add(24, "hours");

    // ✅ Fetch packages booked in next 24 hours
    const packageBookings = await Package.find({
      booked_by: user_id,
      booking_type: "Booked",
      updatedAt: { $gte:startOfDay, $lte: next24Hours.toDate() },
    })
      .sort({ updatedAt: -1 })
      .lean();

    // ✅ Fetch delivery services booked in next 24 hours
    const serviceBookings = await DeliveryService.find({
      booked_by: user_id,
      booking_type: "Booked",
      updatedAt: { $gte: startOfDay, $lte: next24Hours.toDate() },
    })
      .sort({ updatedAt: -1 })
      .lean();

    // 🧩 Merge and format both
    const allBookings = [...packageBookings, ...serviceBookings].map((item) => ({
      _id: item._id,
      type: item.pickup_location ? 0 : 1,
      booking_type: item.booking_type,
      is_available: item.is_available,
      cancel_reason: item.cancel_reason || null,
      pickup_location: item.pickup_location || item.start_location || "",
      drop_location: item.drop_location || item.end_location || "",
      price: item.price || 0,
      booked_at: moment(item.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
    }));

    if (allBookings.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No bookings found in the next 24 hours",
        data: [],
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Bookings are retrieved successfully",
      data: allBookings,
    });
  } catch (error) {
    console.error("Error in getMyBookings:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};

// export const getMyPublished = async (req, res) => {
//   try {
//     const { user_id } = req.query;

//     if (!user_id) {
//       return res.status(400).json({
//         status: "fail",
//         message: "Missing required field (user_id)",
//         data: [],
//       });
//     }

//      const user = await User.findById(user_id)
//       .select("name email phone profile_image verified createdAt")
//       .lean();
//     // 🧭 Fetch rides (services)
//     const rides = await DeliveryService.find({ uid: user_id })
//       .sort({ createdAt: -1 })
//       .lean();

//     // 📦 Fetch packages
//     const packages = await Package.find({ uid: user_id })
//       .sort({ createdAt: -1 })
//       .lean();

//     // 🧩 Combine both arrays
//     const combined = [
//       ...rides.map((r) => ({
//         id: r._id,
//         user,
//         type: 1,
//         start_location: r.start_location,
//         end_location: r.end_location,
//         price: r.price,
//         transport_type: r.transport_type || "N/A",
//         description: r.description || "",
//         is_available: r.is_available,
//         booking_type: r.booking_type || null,
//         created_at: r.createdAt
//           ? moment(r.createdAt).format("YYYY-MM-DD HH:mm:ss")
//           : null,
//         date_time: r.date_time
//           ? moment(r.date_time).format("YYYY-MM-DD HH:mm:ss")
//           : null,
//       })),
//       ...packages.map((p) => ({
//         id: p._id,
//         user,
//         type: 0,
//         pickup_location: p.pickup_location,
//         drop_location: p.drop_location,
//         price: p.price,
//         description: p.description || "",
//         is_available: p.is_available,
//         booking_type: p.booking_type || null,
//         created_at: p.createdAt
//           ? moment(p.createdAt).format("YYYY-MM-DD HH:mm:ss")
//           : null,
//         date_time: p.date_time
//           ? moment(p.date_time).format("YYYY-MM-DD HH:mm:ss")
//           : null,
//       })),
//     ];

//     // 🕒 Sort by creation date (latest first)
//     combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

//     return res.status(200).json({
//       status: "success",
//       message: "My published rides and packages fetched successfully",
//       data: combined,
//     });
//   } catch (error) {
//     console.error("Error fetching published items:", error);
//     return res.status(500).json({
//       status: "fail",
//       message: "Internal server error",
//       data: [],
//     });
//   }
// };

export const getMyPublished = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required field (user_id)",
        data: [],
      });
    }

    // 🧑‍💻 Fetch user details once
    const user = await User.findById(user_id)
      .select("first_name last_name email phone")
      .lean({getters:true});

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
        data: [],
      });
    }

    // 🧭 Fetch rides
    // 🧭 Fetch rides
const rides = await DeliveryService.find({ uid: user_id })
  .sort({ createdAt: -1 })
  .lean();

// 📦 Fetch packages
const packages = await Package.find({ uid: user_id })
  .sort({ createdAt: -1 })
  .lean();

// 🧩 Combine both arrays with formatted dates
const combined = [
  ...rides.map((r) => {
    const formatted = {
      ...r,
      type: 1,
      user,
      createdAt: r.createdAt
        ? moment(r.createdAt).format("YYYY-MM-DD HH:mm:ss")
        : null,
      updatedAt: r.updatedAt
        ? moment(r.updatedAt).format("YYYY-MM-DD HH:mm:ss")
        : null,
      date_time: r.date_time
        ? moment(r.date_time).format("YYYY-MM-DD HH:mm:ss")
        : null,
    };
    delete formatted.createdAt; // 🧹 remove raw fields
    delete formatted.updatedAt;
    return formatted;
  }),
  ...packages.map((p) => {
    const formatted = {
      ...p,
      type: 0,
      user,
      createdAt: p.createdAt
        ? moment(p.createdAt).format("YYYY-MM-DD HH:mm:ss")
        : null,
      updatedAt: p.updatedAt
        ? moment(p.updatedAt).format("YYYY-MM-DD HH:mm:ss")
        : null,
      date_time: p.date_time
        ? moment(p.date_time).format("YYYY-MM-DD HH:mm:ss")
        : null,
    };
    delete formatted.createdAt;
    delete formatted.updatedAt;
    return formatted;
  }),
];


    // 🕒 Sort by latest creation
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      status: "success",
      message: "My published rides and packages fetched successfully",
      data: combined,
    });
  } catch (error) {
    console.error("Error fetching published items:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
      data: [],
    });
  }
};

export const updateDeliveryService = async (req, res) => {
  try {
    // const { service_id } = req.query;
    const {service_id, start_lat, start_long, end_lat, end_long, ...otherFields } = req.body || {};

    if (!service_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing service_id in query",
        data: [],
      });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    let route_path = [];

    // ✅ Recalculate route only if coordinates are updated
    if (start_lat && start_long && end_lat && end_long) {
      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${start_lat},${start_long}&destination=${end_lat},${end_long}&key=${googleApiKey}`;
      const mainResponse = await axios.get(mainUrl);
      const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

      mainSteps.forEach((step) => {
        route_path.push({
          lat: step.start_location.lat,
          long: step.start_location.lng,
        });
      });
      route_path.push({ lat: end_lat, long: end_long });

      // ➕ Extend route by 20 km beyond end location
      const extendDistance = 20;
      const earthRadius = 6371;
      const newLat = end_lat + (extendDistance / earthRadius) * (180 / Math.PI);
      const newLong =
        end_long +
        ((extendDistance / earthRadius) * (180 / Math.PI)) /
          Math.cos((end_lat * Math.PI) / 180);

      const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${end_lat},${end_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
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
      ...otherFields,
      ...(start_lat && { start_lat }),
      ...(start_long && { start_long }),
      ...(end_lat && { end_lat }),
      ...(end_long && { end_long }),
      ...(route_path.length > 0 && { route_path }),
    };

    console.log("🟢 Update Data:", updateData);

    // ✅ Update the delivery service
    const updatedService = await DeliveryService.findByIdAndUpdate(service_id, updateData, {
      new: true,
    });

    if (!updatedService) {
      return res.status(404).json({
        status: "fail",
        message: "Delivery service not found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Delivery service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    console.error("Error updating delivery service:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};

export const updatePackage = async (req, res) => {
  try {
    // const { package_id } = req.query;
    const {package_id, pickup_lat, pickup_long, drop_lat, drop_long, ...otherFields } = req.body || {};

    if (!package_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing package_id in body",
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