import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Package from "../models/Package.js";
import DeliveryService from "../models/DeliveryService.js";
import { getNextConversationId } from "../utils/getNextId.js";
import Notification from "../models/Notification.js";
import moment from "moment";

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
      type: item.pickup_location ? "package" : "ride",
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

     const user = await User.findById(user_id)
      .select("name email phone profile_image verified createdAt")
      .lean();
    // 🧭 Fetch rides (services)
    const rides = await DeliveryService.find({ uid: user_id })
      .sort({ createdAt: -1 })
      .lean();

    // 📦 Fetch packages
    const packages = await Package.find({ uid: user_id })
      .sort({ createdAt: -1 })
      .lean();

    // 🧩 Combine both arrays
    const combined = [
      ...rides.map((r) => ({
        id: r._id,
        user,
        type: 1,
        start_location: r.start_location,
        end_location: r.end_location,
        price: r.price,
        transport_type: r.transport_type || "N/A",
        description: r.description || "",
        is_available: r.is_available,
        booking_type: r.booking_type || null,
        created_at: r.createdAt
          ? moment(r.createdAt).format("YYYY-MM-DD HH:mm:ss")
          : null,
        date_time: r.date_time
          ? moment(r.date_time).format("YYYY-MM-DD HH:mm:ss")
          : null,
      })),
      ...packages.map((p) => ({
        id: p._id,
        user,
        type: 0,
        pickup_location: p.pickup_location,
        drop_location: p.drop_location,
        price: p.price,
        description: p.description || "",
        is_available: p.is_available,
        booking_type: p.booking_type || null,
        created_at: p.createdAt
          ? moment(p.createdAt).format("YYYY-MM-DD HH:mm:ss")
          : null,
        date_time: p.date_time
          ? moment(p.date_time).format("YYYY-MM-DD HH:mm:ss")
          : null,
      })),
    ];

    // 🕒 Sort by creation date (latest first)
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

