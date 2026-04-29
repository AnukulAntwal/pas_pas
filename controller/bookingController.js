import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Package from "../models/Package.js";
import dotenv from "dotenv";
import axios from "axios";
import DeliveryService from "../models/DeliveryService.js";
import { getNextConversationId } from "../utils/getNextId.js";
import Notification from "../models/Notification.js";
import Booking from "../models/Booking.js";
import {
  extractBlaBlaCarStops,
  filterStopsBetween,
  getCityFromLatLong,
  getRoadStops,
  validateRouteDirection,
  computeRouteMatchScore,
} from "../utils/helper/getCityFromLatLong.js";
// import moment from "moment";
import moment from "moment-timezone";

dotenv.config();

export const bookServiceOrPackage = async (req, res) => {
  try {
    const { reference_id, message, offer_price } = req.body;
    const userId = req.user._id;
    const type = Number(req.body.type);
    console.log('type booking - ',type);

    console.log('booking response  - ',req.body);

    

    if (!reference_id || type === undefined) {
      return res.status(400).json({
        status: "fail",
        message: "reference_id and type required",
        data: []
      });
    }

    // 🔎 get reference owner
    let referenceData;
    if (type === 1) {
      referenceData = await DeliveryService.findById(reference_id).select("uid");
    } else if (type === 0) {
      referenceData = await Package.findById(reference_id).select("uid");
    } else {
      return res.status(400).json({
        status: "fail",
        message: "Invalid type",
        data: []
      });
    }
    
    if(!referenceData){
      return res.status(404).json({
        status: "fail",
        message: "Reference not found",
        data: []
      });
    }
    // ❌ User cannot book own service/package
    if (referenceData?.uid?.toString() === userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You cannot book your own service",
        data: []
      });
    }
    


    // 🔍 check already booked
    let booking = await Booking.findOne({ reference_id });

    if (booking && booking.is_booked === 1) {
      return res.status(200).json({
        status: "success",
        message: "Already booked",
        data: []
      });
    }

    if (!booking) {
      booking = new Booking({
        reference_id,
        type,
        is_booked: 1,
        status: 1,
        booking_type: "Booked",
        booked_by: userId,
        cancel_reason: ""
      });
    } else {
      booking.type = type;
      booking.is_booked = 1;
      booking.status = 1;
      booking.booking_type = "Booked";
      booking.booked_by = userId;
      booking.cancel_reason = "";
    }

    await booking.save();

    /* =========================
       CHAT + NOTIFICATION
    ========================= */

    const receiverId = referenceData?.uid;
    let sentMessage = message && message.trim() !== ""
      ? message
      : "Your service has been booked.";

    if (receiverId) {
      const conversation_id = await getNextConversationId();

      // 💬 CHAT
      await Chat.create({
        conversation_id,
        conversation_for: type,
        reference_id,
        sender_id: userId,
        receiver_id: receiverId,
        message: sentMessage,
        unread_count: 1,
        is_read: 0
      });

      let message_text ="";
      if(type === 1){
        message_text = "Your transport service has been booked.";
      }else if(type === 0){ 
        message_text = "Your parcel has been booked.";
      }
      let message_type = "Booked";

      // 🔔 NOTIFICATION
      await Notification.create({
        sender_id: userId,
        receiver_id: receiverId,
        conversation_id,
        message_type: message_type,
        reference_id,
        message_text: message_text,
        type: "message"
      });
      booking.conversation_id = conversation_id;
      await booking.save();
    }

    /* =========================
   UPDATE AVAILABILITY
    ========================= */
    let updateData = {
      is_available: 0
    };

    if (offer_price) {
      updateData.price = offer_price;
    }
    if (type === 1) {
      // Delivery Service booked
      await DeliveryService.findByIdAndUpdate(
        reference_id,
        updateData,
        { new: true }
      );
    } else if (type === 0) {
      // Package booked
      await Package.findByIdAndUpdate(
        reference_id,
        { is_available: 0 },
        { new: true }
      );
    }


    /* =========================
       USER DETAILS (RESPONSE)
    ========================= */

    const bookedByUser = await User.findById(userId)
      .select("first_name last_name phone_number email badge is_verified_user")
      .lean();

    const referenceOwner = receiverId
      ? await User.findById(receiverId)
          .select("first_name last_name phone_number email badge is_verified_user")
          .lean()
      : null;

    return res.status(200).json({
      status: "success",
      message: "Booked successfully",
      data: {
        booking_id: booking._id,
        reference_id,
        type,
        booking_type: booking.booking_type,
        is_booked: booking.is_booked,
        offer_price: offer_price ?? null,
        booked_by: bookedByUser,
        reference_owner: referenceOwner
      }
    });

  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: err.message,
      data: []
    });
  }
};



export const cancelBookingByReference = async (req, res) => {
  try {
    const { reference_id, cancel_reason } = req.body;
    const userId = req.user._id;

    if (!reference_id) {
      return res.status(400).json({
        status: "fail",
        message: "reference_id required",
        data: []
      });
    }

    const booking = await Booking.findOne({ reference_id });

    if (!booking) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found",
        data: []
      });
    }

    if (booking.is_booked === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Already not booked",
        data: []
      });
    }

    /* =========================
       GET REFERENCE OWNER
    ========================= */
    let referenceData;

    if (booking.type === 1) {
      referenceData = await DeliveryService.findById(reference_id).select("uid").lean();
    } else {
      referenceData = await Package.findById(reference_id).select("uid").lean();
    }

    const referenceOwnerId = referenceData?.uid;

    const isOwner = referenceOwnerId?.toString() === userId.toString();
    const isBooker = booking.booked_by?.toString() === userId.toString();

    if (!isOwner && !isBooker) {
      return res.status(403).json({
        status: "fail",
        message: "Not allowed",
        data: []
      });
    }

    /* =========================
       IMPORTANT: STORE DATA FIRST
    ========================= */

    const bookedUserId = booking.booked_by; // ✅ save before null
    const conversation_id = booking.conversation_id; // ✅ SAME CHAT

    /* =========================
       UPDATE BOOKING
    ========================= */

    booking.is_booked = 0;
    booking.status = 0;
    booking.booking_type = "Cancelled";
    booking.cancel_reason = cancel_reason || "";
    booking.booked_by = null;   

    await booking.save();

    /* =========================
       DECIDE RECEIVER + MESSAGE
    ========================= */

    let receiverId;
    let message_text = "";

    if (isOwner) {
      // 🔥 Owner cancel → notify booker
      receiverId = bookedUserId;
      message_text = "Your booking has been cancelled by the owner with reason: " + cancel_reason;
    } else {
      // 🔥 Booker cancel → notify owner
      receiverId = referenceOwnerId;
      message_text = "Booking has been cancelled by the user with reason: " + cancel_reason;
    }

    /* =========================
       SEND CHAT MESSAGE (SAME CONVERSATION)
    ========================= */

    if (receiverId && conversation_id) {
      await Chat.create({
        conversation_id,
        conversation_for: booking.type,
        reference_id,
        sender_id: userId,
        receiver_id: receiverId,
        message: message_text,
        unread_count: 1,
        is_read: 0
      });

      /* =========================
         NOTIFICATION
      ========================= */

      await Notification.create({
        sender_id: userId,
        receiver_id: receiverId,
        conversation_id,
        reference_id,
        message_type: "Cancelled",
        message_text,
        type: "message"
      });

      await Chat.updateMany(
        { conversation_id: booking.conversation_id },
        { $set: { is_disabled: 1 } }
      );
    }

    /* =========================
       UPDATE AVAILABILITY
    ========================= */

    if (booking.type === 1) {
      await DeliveryService.findByIdAndUpdate(reference_id, { is_available: 1 });
    } else {
      await Package.findByIdAndUpdate(reference_id, { is_available: 1 });
    }

    return res.status(200).json({
      status: "success",
      message: "Booking cancelled successfully",
      data: {
        booking_id: booking._id,
        cancelled_by_role: isOwner ? "owner" : "booker"
      }
    });

  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: err.message,
      data: []
    });
  }
};

export const getMyBookings = async (req, res) => {
  try {

    const userId = req.user._id;
    const todayStart = moment().startOf("day").toDate();

    const bookings = await Booking.find({
      is_booked: 1
    })
      .sort({ createdAt: -1 })
      .lean();

    const result = [];

    const host = `${req.protocol}://${req.get("host")}`;


  const attachProfileImage = (user) => {
    if (!user) return null;

    return {
      ...user,
      profile_image: user.profile_image
        ? `${host}/uploads/profile_images/${user.profile_image}`
        : null
    };
  };

    for (const booking of bookings) {

      let referenceOwner = null;
      let referenceDetails = null;
      let showUser = null;
      let bookingRole = null;

      // =========================
      // DELIVERY SERVICE
      // =========================
      if (booking.type === 1) {

        const service = await DeliveryService.findById(booking.reference_id)
          .select("uid start_location end_location price date_time")
          .lean();

        if (!service || service.date_time < todayStart || service.is_completed === 1) continue;

        referenceOwner = await User.findById(service.uid)
          .select("first_name last_name phone_number email profile_image badge is_verified_user")
          .lean();

        const bookedByUser = await User.findById(booking.booked_by)
          .select("first_name last_name phone_number email profile_image badge is_verified_user")
          .lean();

        if (booking.booked_by.toString() === userId.toString()) {

          // maine service book ki
          showUser = attachProfileImage(referenceOwner);
          bookingRole = "booked_by_me";

        } else if (service.uid.toString() === userId.toString()) {

          // meri service kisi ne book ki
          showUser = attachProfileImage(bookedByUser);
          bookingRole = "booked_from_me";

        } else {
          continue;
        }

        referenceDetails = {
          reference_id: service._id,
          type: 1,
          start_location: service.start_location,
          end_location: service.end_location,
          price: service.price,
          date_time: moment(service.date_time).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A")
        };
      }

      // =========================
      // PACKAGE
      // =========================
      if (booking.type === 0) {

        const parcel = await Package.findById(booking.reference_id)
          .select("uid pickup_location drop_location price date_time")
          .lean();

        if (!parcel || parcel.date_time < todayStart || parcel.is_completed === 1) continue;
        referenceOwner = await User.findById(parcel.uid)
          .select("first_name last_name phone_number email badge profile_image is_verified_user")
          .lean();

        const bookedByUser = await User.findById(booking.booked_by)
          .select("first_name last_name phone_number email badge profile_image is_verified_user")
          .lean();

        if (booking.booked_by.toString() === userId.toString()) {

          showUser = attachProfileImage(referenceOwner);
          bookingRole = "booked_by_me";

        } else if (parcel.uid.toString() === userId.toString()) {

          showUser = attachProfileImage(bookedByUser);
          bookingRole = "booked_from_me";

        } else {
          continue;
        }

        referenceDetails = {
          reference_id: parcel._id,
          type: 0,
          pickup_location: parcel.pickup_location,
          drop_location: parcel.drop_location,
          price: parcel.price,
          date_time: moment(parcel.date_time).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A")
        };
      }

      result.push({
        booking_id: booking._id,
        reference_id: booking.reference_id,
        type: booking.type,
        booking_type: booking.booking_type,
        status: booking.status,
        cancel_reason: booking.cancel_reason || "",
        booking_role: bookingRole,
        user_details: showUser,
        reference_details: referenceDetails,
        created_at: moment(booking.createdAt).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A")
      });
    }

    if(!result.length){
      return res.status(200).json({
        status: "success",
        message: "No bookings found",
        data: []
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Bookings fetched successfully",
      data: result
    });

  } catch (error) {

    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: []
    });

  }
};



// export const bookOrCancel = async (req, res) => {
//   try {
//     const {
//       reference_id,
//       user_id,
//       type,
//       is_available,
//       message,
//       cancel_reason,
//     } = req.body;

//       if ([reference_id, user_id, type, is_available].some(v => v === undefined)) {
//       return res.status(400).json({
//         status: "fail",
//         message: "Missing required fields (reference_id, user_id, type, is_available)",
//         data: [],
//       });
//     }

//   let bookedFor;
//       if(type === 0){
//         bookedFor = 'package';
//       }else{
//         bookedFor = 'ride';
//       }
//     // ✅ Select model based on type
//     let Model;
//     if (type === 0) Model = Package;
//     else if (type === 1) Model = DeliveryService;
//     else {
//       return res.status(400).json({
//         status: "fail",
//         message: "Invalid type (must be package or service)",
//         data: [],
//       });
//     }

//     // ✅ Fetch record
//     const record = await Model.findById(reference_id);
//     if (!record) {
//       return res.status(404).json({
//         status: "fail",
//         message: `${bookedFor} not found`,
//         data: [],
//       });
//     }

//     let chatResponse = null;

//     // ✅ BOOKING LOGIC
//     if (is_available === 0) {
//       if (record.is_available === 0) {
//         return res.status(400).json({
//           status: "fail",
//           message: "Already booked by another user",
//           data: [],
//         });
//       }

//       record.booking_type = "Booked";
//       record.is_available = 0;
//       record.booked_by = user_id;

//       // 🟢 Create chat only if message provided
//       if (message && message.trim() !== "") {
//         const receiver_id =
//           record.uid?.toString() === user_id.toString()
//             ? record.booked_by
//             : record.uid;

//         if (receiver_id) {
//           const conversation_id = await getNextConversationId();

//           // Create Chat
//           await Chat.create({
//             conversation_id,
//             conversation_for: type,
//             reference_id,
//             sender_id: user_id,
//             receiver_id,
//             message,
//             unread_count: 1,
//             is_read: 0,
//           });

//           // Create Notification
//           await Notification.create({
//             sender_id: user_id,
//             receiver_id,
//             conversation_id,
//             reference_id,
//             message_text: message,
//             type: "message",
//           });

//           // 🧩 Fetch contact details
//           const receiver = await User.findById(receiver_id)
//             .select("first_name last_name phone_number")
//             .lean();

//           // 🧩 Fetch conversation logs
//           const allChats = await Chat.find({ conversation_id })
//             .sort({ createdAt: -1 })
//             .lean();

//           const conversation_log = allChats.map((c) => ({
//             conversation: c.message,
//             conversation_date: moment(c.createdAt).format(
//               "YYYY-MM-DD HH:mm:ss"
//             ),
//             conversation_id: c.conversation_id,
//             direction:
//               c.sender_id.toString() === user_id.toString()
//                 ? "outbound"
//                 : "inbound",
//             is_read: c.is_read,
//           }));

//           // 🧩 Build formatted Chat object
//           chatResponse = {
//             contact_details: {
//               id: receiver._id,
//               user_name: `${receiver.first_name || ""} ${
//                 receiver.last_name || ""
//               }`.trim(),
//               contact_number: receiver.phone_number || "",
//               reference_id: record._id,
//             },
//             reference_details: {
//               _id: record._id,
//               reference_id: record._id,
//               reference_type: type,
//               pickup_location:
//                 record.pickup_location || record.start_location || "",
//               drop_location:
//                 record.drop_location || record.end_location || "",
//               price: record.price || "",
//             },
//             conversation_log,
//           };
//         }
//       }
//     }

//     // 🔴 CANCELLATION LOGIC
//     else if (is_available === 1) {
//       if (record.booked_by?.toString() !== user_id.toString()) {
//         return res.status(403).json({
//           status: "fail",
//           message: "You can only cancel your own booking",
//           data: [],
//         });
//       }

//       record.booking_type = "Cancelled";
//       record.is_available = 1;
//       record.booked_by = null;

//       // Only update reason (no chat creation)
//       if (cancel_reason && cancel_reason.trim() !== "") {
//         record.cancel_reason = cancel_reason;
//       }
//     }

//     await record.save();

//     // ✅ Fetch user details
//     const user = await User.findById(user_id)
//       .select("first_name last_name phone_number")
//       .lean();

//     // ✅ Fetch reference details
//     const referenceDetails = await Model.findById(reference_id)
//       .select(
//         type === 0
//           ? "start_location end_location date_time price"
//           : "pickup_address delivery_address package_type weight price"
//       )
//       .lean();
    
//     // ✅ Final Response
//     return res.status(200).json({
//       status: "success",
//       message:
//         is_available === 0
//           ? `${bookedFor} booked successfully`
//           : `${bookedFor} booking cancelled successfully`,
//       data: {
//         reference_id: record._id,
//         type,
//         booking_type: record.booking_type,
//         is_available: record.is_available,
//         cancel_reason: record.cancel_reason || null,
//         booked_by: user || null,
//         reference_details: referenceDetails || null,
//         Chat: chatResponse || null,
//       },
//     });
//   } catch (error) {
//     console.error("Booking error:", error);
//     return res.status(500).json({
//       status: "fail",
//       message: error.message,
//       data: [],
//     });
//   }
// };


// export const getMyBookings = async (req, res) => {
//   try {
//     const { user_id } = req.query;

//     if (!user_id) {
//       return res.status(400).json({
//         status: "fail",
//         message: "user_id is required",
//         data: [],
//       });
//     }

//     // ⏰ Current time → Next 24 hours
//     const startOfDay = moment().startOf("day").toDate();
//     const next24Hours = moment().add(24, "hours");

//     // ✅ Fetch packages booked in next 24 hours
//     const packageBookings = await Package.find({
//       booked_by: user_id,
//       booking_type: "Booked",
//       updatedAt: { $gte:startOfDay, $lte: next24Hours.toDate() },
//     })
//       .sort({ updatedAt: -1 })
//       .lean();

//     // ✅ Fetch delivery services booked in next 24 hours
//     const serviceBookings = await DeliveryService.find({
//       booked_by: user_id,
//       booking_type: "Booked",
//       updatedAt: { $gte: startOfDay, $lte: next24Hours.toDate() },
//     })
//       .sort({ updatedAt: -1 })
//       .lean();

//     // 🧩 Merge and format both
//     const allBookings = [...packageBookings, ...serviceBookings].map((item) => ({
//       _id: item._id,
//       type: item.pickup_location ? 0 : 1,
//       booking_type: item.booking_type,
//       is_available: item.is_available,
//       cancel_reason: item.cancel_reason || null,
//       pickup_location: item.pickup_location || item.start_location || "",
//       drop_location: item.drop_location || item.end_location || "",
//       price: item.price || 0,
//       booked_at: moment(item.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
//     }));

//     if (allBookings.length === 0) {
//       return res.status(200).json({
//         status: "success",
//         message: "No bookings found in the next 24 hours",
//         data: [],
//       });
//     }

//     return res.status(200).json({
//       status: "success",
//       message: "Bookings are retrieved successfully",
//       data: allBookings,
//     });
//   } catch (error) {
//     console.error("Error in getMyBookings:", error);
//     return res.status(500).json({
//       status: "fail",
//       message: error.message,
//       data: [],
//     });
//   }
// };

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
        const user_id = req.user._id;


    if (!user_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required field (user_id)",
        data: [],
      });
    }

    // 🧑‍💻 Fetch user details once
    const user = await User.findById(user_id)
      .select("first_name last_name email phone_number profile_image badge is_verified_user")
      .lean({getters:true});

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
        data: [],
      });
    }

    const todayStart = moment().startOf("day").toDate();

    // 🧭 Fetch rides
const rides = await DeliveryService.find({
  uid: user_id,
  date_time: { $gte: todayStart }, // ✅ today & future only
  is_completed: 0 // ✅ only active rides
})
  .sort({ createdAt: -1 })
  .lean();


// 📦 Fetch packages
const packages = await Package.find({
  uid: user_id,
  date_time: { $gte: todayStart }, // ✅ today & future only
  is_completed: 0 // ✅ only active packages
})
  .sort({ createdAt: -1 })
  .lean();

// 🧩 Combine both arrays with formatted dates
const combined = [
  ...rides.map((r) => {
    const formatted = {
      ...r,
      type: 1,
      user,
      created_at: r.createdAt
        ? moment(r.createdAt).utc().utcOffset("+05:30").format("DD MMM YYYY, hh:mm A")
        : null,
      updated_at: r.updatedAt
        ? moment(r.updatedAt).utc().utcOffset("+05:30").format("DD MMM YYYY, hh:mm A")
        : null,
      date_time: r.date_time
        ? moment(r.date_time).utc().utcOffset("+05:30").format("DD MMM YYYY, hh:mm A")
        : null,
    };
    delete formatted.createdAt;
    delete formatted.updatedAt;
    return formatted;
  }),

  ...packages.map((p) => {
    const formatted = {
      ...p,
      type: 0,
      user,
      created_at: p.createdAt
        ? moment(p.createdAt).utc().utcOffset("+05:30").format("DD MMM YYYY, hh:mm A")
        : null,
      updated_at: p.updatedAt
        ? moment(p.updatedAt).utc().utcOffset("+05:30").format("DD MMM YYYY, hh:mm A")
        : null,
      date_time: p.date_time
        ? moment(p.date_time).utc().utcOffset("+05:30").format("DD MMM YYYY, hh:mm A")
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
    const {
      service_id,
      start_lat,
      start_long,
      end_lat,
      end_long,
      date_time,
      ...otherFields
    } = req.body || {};

    if (!service_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing service_id",
        data: [],
      });
    }
// console.log("Incoming date_time:", req.body.date_time);
    const existingService = await DeliveryService.findById(service_id);

    if (!existingService) {
      return res.status(404).json({
        status: "fail",
        message: "Delivery service not found",
        data: [],
      });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    let route_path = existingService.route_path;
    let road_stops = existingService.road_stops;

    // ✅ Only recalculate if location changed
    const locationChanged =
      start_lat &&
      start_long &&
      end_lat &&
      end_long &&
      (
        start_lat !== existingService.start_lat ||
        start_long !== existingService.start_long ||
        end_lat !== existingService.end_lat ||
        end_long !== existingService.end_long
      );

    if (locationChanged) {
      route_path = [];

      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${start_lat},${start_long}&destination=${end_lat},${end_long}&key=${googleApiKey}`;

      const mainResponse = await axios.get(mainUrl);

      if (mainResponse.data.status !== "OK") {
        return res.status(400).json({
          status: "fail",
          message: "Google Directions API error",
        });
      }

      const mainSteps =
        mainResponse.data.routes[0]?.legs[0]?.steps || [];

      // ✅ Start point
      route_path.push({ lat: start_lat, long: start_long });

      // ✅ Collect step end locations
      mainSteps.forEach((step) => {
        route_path.push({
          lat: step.end_location.lat,
          long: step.end_location.lng,
        });
      });

      // ✅ Direction based extension (same as save)
      if (route_path.length >= 2) {
        const extendDistanceKm = 20;
        const last = route_path[route_path.length - 1];
        const secondLast = route_path[route_path.length - 2];

        const dx = last.lat - secondLast.lat;
        const dy = last.long - secondLast.long;

        const magnitude = Math.sqrt(dx * dx + dy * dy);

        if (magnitude > 0) {
          const scale = (extendDistanceKm / 111) / magnitude;

          const newLat = last.lat + dx * scale;
          const newLong = last.long + dy * scale;

          route_path.push({
            lat: newLat,
            long: newLong,
          });
        }
      }

      // ✅ Recalculate road stops
      road_stops = await getRoadStops(
        start_lat,
        start_long,
        end_lat,
        end_long,
        googleApiKey
      );

      // ✅ City enrichment (same logic as save)
      const SAMPLE_EVERY = 4;

      route_path = await Promise.all(
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
    }

    // ✅ Prepare update object safely
    let dateTimeUTC;

    if (date_time) {
      const parsed = moment.tz(
        date_time,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      );

      if (parsed.isValid()) {
        dateTimeUTC = parsed.utc().toDate();
      }
    }
    const updateData = {
      ...otherFields,
      ...(start_lat && { start_lat }),
      ...(start_long && { start_long }),
      ...(end_lat && { end_lat }),
      ...(end_long && { end_long }),
      ...(locationChanged && { route_path }),
      ...(locationChanged && { road_stops }),
      ...(dateTimeUTC && { date_time: dateTimeUTC }),
    };

    const updatedService = await DeliveryService.findByIdAndUpdate(
      service_id,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Delivery service updated successfully",
      data: updatedService,
    });

  } catch (error) {
    console.error("Error updating delivery service:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};

// export const updatePackage = async (req, res) => {
//   try {
//     // const { package_id } = req.query;
//     const {package_id, pickup_lat, pickup_long, drop_lat, drop_long,date_time, ...otherFields } = req.body || {};

//     if (!package_id) {
//       return res.status(400).json({
//         status: "fail",
//         message: "Missing package_id in body",
//       });
//     }

//     const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
//     let route_path = [];

//     // ✅ Recalculate route only if pickup/drop coordinates are updated
//     if (pickup_lat && pickup_long && drop_lat && drop_long) {
//       const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup_lat},${pickup_long}&destination=${drop_lat},${drop_long}&key=${googleApiKey}`;
//       const mainResponse = await axios.get(mainUrl);
//       const mainSteps = mainResponse.data.routes[0]?.legs[0]?.steps || [];

//       mainSteps.forEach((step) => {
//         route_path.push({
//           lat: step.start_location.lat,
//           long: step.start_location.lng,
//         });
//       });
//       route_path.push({ lat: drop_lat, long: drop_long });

//       // ➕ Extend route by 20 km beyond drop
//       const extendDistance = 20;
//       const earthRadius = 6371;
//       const newLat = drop_lat + (extendDistance / earthRadius) * (180 / Math.PI);
//       const newLong =
//         drop_long +
//         ((extendDistance / earthRadius) * (180 / Math.PI)) /
//           Math.cos((drop_lat * Math.PI) / 180);

//       const extendUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${drop_lat},${drop_long}&destination=${newLat},${newLong}&key=${googleApiKey}`;
//       const extendResponse = await axios.get(extendUrl);
//       const extendSteps = extendResponse.data.routes[0]?.legs[0]?.steps || [];

//       extendSteps.forEach((step) => {
//         route_path.push({
//           lat: step.start_location.lat,
//           long: step.start_location.lng,
//         });
//       });
//       route_path.push({ lat: newLat, long: newLong });
//     }
    
//     let dateTimeUTC;
//     if (date_time) {
//       const parsed = moment.tz(
//         date_time,
//         "YYYY-MM-DD HH:mm:ss",
//         "Asia/Kolkata"
//       );

//       if (parsed.isValid()) {
//         dateTimeUTC = parsed.utc().toDate();
//       }
//     }
//     // ✅ Prepare dynamic update object
//     const updateData = {
//       ...otherFields, // e.g. package_type, price, etc.
//       ...(pickup_lat && { pickup_lat }),
//       ...(pickup_long && { pickup_long }),
//       ...(drop_lat && { drop_lat }),
//       ...(drop_long && { drop_long }),
//       ...(dateTimeUTC && { date_time: dateTimeUTC }),
//       ...(route_path.length > 0 && { route_path }),
//     };

//     console.log("🟢 Update Data:", updateData);

//     // ✅ Perform update
//     const updatedPackage = await Package.findByIdAndUpdate(package_id, updateData, {
//       new: true,
//     });

//     if (!updatedPackage) {
//       return res.status(404).json({
//         status: "fail",
//         message: "Package not found",
//         data: [],
//       });
//     }

//     res.status(200).json({
//       status: "success",
//       message: "Package updated successfully",
//       data: updatedPackage,
//     });
//   } catch (error) {
//     console.error("❌ Error updating package:", error);
//     res.status(500).json({
//       status: "fail",
//       message: error.message,
//       data: [],
//     });
//   }
// };

export const updatePackage = async (req, res) => {
  try {
    const {
      package_id,
      pickup_lat,
      pickup_long,
      drop_lat,
      drop_long,
      date_time,
      ...otherFields
    } = req.body || {};

    if (!package_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing package_id",
      });
    }

    const existingPackage = await Package.findById(package_id);

    if (!existingPackage) {
      return res.status(404).json({
        status: "fail",
        message: "Package not found",
      });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    let route_path = existingPackage.route_path;
    let road_stops = existingPackage.road_stops;

    // ✅ Check if location changed
    const locationChanged =
      pickup_lat &&
      pickup_long &&
      drop_lat &&
      drop_long &&
      (
        pickup_lat !== existingPackage.pickup_lat ||
        pickup_long !== existingPackage.pickup_long ||
        drop_lat !== existingPackage.drop_lat ||
        drop_long !== existingPackage.drop_long
      );

    // --------------------------------------------------
    // ✅ Recalculate only if location changed
    // --------------------------------------------------
    if (locationChanged) {
      route_path = [];

      const mainUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup_lat},${pickup_long}&destination=${drop_lat},${drop_long}&key=${googleApiKey}`;

      const mainResponse = await axios.get(mainUrl);

      if (mainResponse.data.status !== "OK") {
        console.error("Google API Error:", mainResponse.data);
        return res.status(400).json({
          status: "fail",
          message: "Directions API error",
        });
      }

      const mainSteps =
        mainResponse.data.routes[0]?.legs[0]?.steps || [];

      // ✅ Add pickup
      route_path.push({ lat: pickup_lat, long: pickup_long });

      // ✅ Add steps (optimized sampling)
      mainSteps.forEach((step, index) => {
        if (index % 2 === 0) {
          route_path.push({
            lat: step.end_location.lat,
            long: step.end_location.lng,
          });
        }
      });

      // ✅ Direction-based extension (same as save)
      if (route_path.length >= 2) {
        const extendDistanceKm = 20;

        const last = route_path.at(-1);
        const secondLast = route_path.at(-2);

        const dx = last.lat - secondLast.lat;
        const dy = last.long - secondLast.long;

        const magnitude = Math.sqrt(dx * dx + dy * dy);

        if (!isNaN(magnitude) && magnitude > 0) {
          const scale = (extendDistanceKm / 111) / magnitude;

          route_path.push({
            lat: last.lat + dx * scale,
            long: last.long + dy * scale,
          });
        }
      }

      // ✅ Road stops
      road_stops = await getRoadStops(
        pickup_lat,
        pickup_long,
        drop_lat,
        drop_long,
        googleApiKey
      );

      // ✅ City enrichment (same as delivery)
      const SAMPLE_EVERY = 4;

      route_path = await Promise.all(
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
    }

    // ✅ Date handling (same as delivery)
    let dateTimeUTC;

    if (date_time) {
      const parsed = moment.tz(
        date_time,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      );

      if (parsed.isValid()) {
        dateTimeUTC = parsed.utc().toDate();
      }
    }

    // ✅ Final update object
    const updateData = {
      ...otherFields,
      ...(pickup_lat && { pickup_lat }),
      ...(pickup_long && { pickup_long }),
      ...(drop_lat && { drop_lat }),
      ...(drop_long && { drop_long }),
      ...(locationChanged && { route_path }),
      ...(locationChanged && { road_stops }),
      ...(dateTimeUTC && { date_time: dateTimeUTC }),
    };

    const updatedPackage = await Package.findByIdAndUpdate(
      package_id,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Package updated successfully",
      data: updatedPackage,
    });

  } catch (error) {
    console.error("❌ Error updating package:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const deleteParcelOrDeliveryService = async (req, res) => {
  try {
    const { reference_id, delete_reason } = req.body;
    const type = Number(req.body.type);
    const userId = req.user._id;

    // ✅ Validation
    if (!reference_id || (type !== 0 && type !== 1)) {
      return res.status(400).json({
        status: "fail",
        message: "reference_id and valid type required",
        data: [],
      });
    }

    let Model;

    if (type === 1) {
      Model = DeliveryService;
    } else if(type == 0){
      Model = Package;
    }

    // ✅ Find record
    const data = await Model.findById(reference_id);

    if (!data) {
      return res.status(404).json({
        status: "fail",
        message: "Record not found",
        data: [],
      });
    }

    // 🔐 Ownership check
    if (data.uid.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You can delete only your own data",
        data: [],
      });
    }

    // 🔍 Check booking
    const booking = await Booking.findOne({
      reference_id,
      is_booked: 1,
    });

    // =========================
    // CASE 1: BOOKED
    // =========================
    let delete_reason_message = "";

    if (booking) {

      // ❌ Reason required
      if (!delete_reason || delete_reason.trim() === "") {
        return res.status(400).json({
          status: "fail",
          message: "Delete reason is required for booked Transport/Parcels",
          data: [],
        });
      }
      const conversation_id = await getNextConversationId();
      delete_reason_message = `The ${type === 1 ? "Transport Service" : "Package"} you booked has been removed by the owner with Reason: ${delete_reason}`;


      // 🔔 Send notification to booked user
      await Notification.create({
        sender_id: userId,
        receiver_id: booking.booked_by,
        reference_id,
        conversation_id,
        message_type: "Deleted",
        message_text: delete_reason_message ? delete_reason_message : delete_reason,
      });

      // 🗑️ Delete after notification
      await Model.findByIdAndDelete(reference_id);

      return res.status(200).json({
        status: "success",
        message: "Deleted successfully and user notified",
        data: [],
      });
    }

    // =========================
    // CASE 2: NOT BOOKED
    // =========================
    await Model.findByIdAndDelete(reference_id);

    return res.status(200).json({
      status: "success",
      message: "Deleted successfully",
      data: [],
    });

  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};

export const completedTransportOrParcel = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    /* =========================
       STEP 1: FETCH BOOKINGS (BOOKED BY ME)
    ========================= */

    const bookings = await Booking.find({
      booking_type: "Booked",
      is_booked: 1,
      booked_by: userId
    })
      .select("reference_id type booked_by")
      .lean();

    /* =========================
       STEP 2: OWNER BOOKINGS (IMPORTANT FIX)
    ========================= */

    // 1. meri completed deliveries
    const myDeliveries = await DeliveryService.find({
      uid: userId,
      is_completed: 1
    }).select("_id").lean();

    const myDeliveryIds = myDeliveries.map(d => d._id.toString());

    const ownerDeliveryBookings = await Booking.find({
      reference_id: { $in: myDeliveryIds },
      is_booked: 1
    })
      .select("reference_id type booked_by")
      .lean();

    // 2. meri completed packages
    const myPackages = await Package.find({
      uid: userId,
      is_completed: 1
    }).select("_id").lean();

    const myPackageIds = myPackages.map(p => p._id.toString());

    const ownerPackageBookings = await Booking.find({
      reference_id: { $in: myPackageIds },
      is_booked: 1
    })
      .select("reference_id type booked_by")
      .lean();

    /* =========================
       STEP 3: MERGE BOOKINGS
    ========================= */

    const allBookings = [
      ...bookings,
      ...ownerDeliveryBookings,
      ...ownerPackageBookings
    ];

    if (!allBookings.length) {
      return res.status(200).json({
        status: "success",
        message: "No completed data found",
        count: 0,
        data: []
      });
    }

    /* =========================
       STEP 4: SEPARATE IDS
    ========================= */

    const deliveryIds = [];
    const packageIds = [];

    allBookings.forEach(b => {
      if (b.type === 1) deliveryIds.push(b.reference_id);
      if (b.type === 0) packageIds.push(b.reference_id);
    });

    /* =========================
       STEP 5: FETCH SERVICES
    ========================= */

    const deliveries = await DeliveryService.find({
      _id: { $in: deliveryIds },
      is_completed: 1
    })
      .select("start_location end_location date_time price uid")
      .lean();

    const packages = await Package.find({
      _id: { $in: packageIds },
      is_completed: 1
    })
      .select("pickup_location drop_location date_time price uid")
      .lean();

    /* =========================
       STEP 6: BOOKING MAP (IMPORTANT FIX)
    ========================= */

    const bookingMap = {};
    allBookings.forEach(b => {
      bookingMap[b.reference_id.toString()] = b.booked_by;
    });

    /* =========================
       STEP 7: USER IDS
    ========================= */

    const userIds = new Set();

    [...deliveries, ...packages].forEach(item => {
      if (item.uid) userIds.add(item.uid.toString());

      const bookedBy = bookingMap[item._id.toString()];
      if (bookedBy) userIds.add(bookedBy.toString());
    });

    const users = await User.find({
      _id: { $in: Array.from(userIds) }
    })
      .select("first_name last_name phone_number profile_image badge is_verified_user")
      .lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    const host = `${req.protocol}://${req.get("host")}`;

    const formatUser = (user) => {
      if (!user) return null;
      return {
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        badge: user.badge,
        is_verified_user: user.is_verified_user,
        profile_image: user.profile_image
          ? `${host}/uploads/profile_images/${user.profile_image}`
          : null
      };
    };

    /* =========================
       STEP 8: FORMAT
    ========================= */

    const formattedDeliveries = deliveries.map(item => {
      const isOwner = item.uid.toString() === userId;
      const bookedBy = bookingMap[item._id.toString()];
      const otherUserId = isOwner ? bookedBy : item.uid;

      return {
        type: 1,
        _id: item._id,
        from: item.start_location,
        to: item.end_location,
        date_time: item.date_time,
        price: item.price,
        booking_role: isOwner ? "booked_from_me" : "booked_by_me",
        user_details: formatUser(userMap[otherUserId?.toString()])
      };
    });

    const formattedPackages = packages.map(item => {
      const isOwner = item.uid.toString() === userId;
      const bookedBy = bookingMap[item._id.toString()];
      const otherUserId = isOwner ? bookedBy : item.uid;

      return {
        type: 0,
        _id: item._id,
        from: item.pickup_location,
        to: item.drop_location,
        date_time: item.date_time,
        price: item.price,
        booking_role: isOwner ? "booked_from_me" : "booked_by_me",
        user_details: formatUser(userMap[otherUserId?.toString()])
      };
    });

    const combinedData = [...formattedDeliveries, ...formattedPackages]
      .sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

    return res.status(200).json({
      status: "success",
      message: "Completed services fetched",
      count: combinedData.length,
      data: combinedData
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: []
    });
  }
};