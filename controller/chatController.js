// controllers/chatController.js
import Chat from "../models/Chat.js";
import { v4 as uuidv4 } from "uuid";
import Package from "../models/Package.js"; // 👈 define if exists
import Ride from "../models/DeliveryService.js"; 
import User from "../models/User.js";
import { getNextConversationId } from "../utils/getNextId.js";
import mongoose from "mongoose";
import moment from "moment-timezone";
import Notification from "../models/Notification.js";


export const sendMessage = async (req, res) => {
  try {
    const {
      conversation_id,
      conversation_for,
      reference_id,
      sender_id,
      receiver_id,
      message,
    } = req.body;

    if (!reference_id || conversation_for === undefined || !sender_id || !receiver_id || !message )
    {
    return res.status(400).json({
        status: "fail",
        message: "Missing required fields (reference_id, conversation_for, sender_id, receiver_id, message)",
        data: [],
    });
    }

    console.log(req.body);
    // ✅ Generate new conversation_id if not provided
    let finalConversationId = conversation_id;
    if (!finalConversationId) {
    finalConversationId = await getNextConversationId(); // e.g. 101, 102...
    }

    const newMessage = new Chat({
      conversation_id: finalConversationId,
      conversation_for,
      reference_id,
      sender_id,
      receiver_id,
      message,
      unread_count: 1,
    });
    console.log(newMessage);
    
    await newMessage.save();
      // ✅ Create new notification
    const newNotification = await Notification.create({
      sender_id,
      receiver_id,
      conversation_id:finalConversationId,
      reference_id,
      message_type:"Comment",
      message_text: message,
      type: "message",
    });
    console.log('Notification create - ', newNotification);
    
    res.status(200).json({
      status: "success",
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data:[]
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversation_id, user_id, is_read } = req.query;
    console.log(conversation_id);
    console.log(user_id);
    
    if (!conversation_id || !user_id) {
      return res.status(400).json({
        status: "fail",
        message: "conversation_id and user_id are required",
        data: [],
      });
    }

    // 🟢 Step 1: Mark all messages received by this user in this conversation as read
    if (is_read && Number(is_read) === 1) {
      await Chat.updateMany(
        {
          conversation_id,
          receiver_id: user_id,
          is_read: 0,
        },
        { $set: { is_read: 1 } }
      );
    }


    // 🟢 Step 2: Fetch all messages of this conversation
    const messages = await Chat.find({
      conversation_id,
      status: "active",
    })
      .populate("sender_id", "first_name last_name email phone_number badge is_verified_user")
      .populate("receiver_id", "first_name last_name email phone_number badge is_verified_user")
      .sort({ createdAt: 1 });

    if (!messages.length) {
      return res.status(200).json({
        status: "fail",
        message: "No messages found",
        data: [],
      });
    }

    // 🟢 Step 3: Get reference details
    const firstMsg = messages[0];
    let refDetails = null;
    let reference_type = null;

    if (firstMsg.conversation_for === 0) {
      refDetails = await Package.findById(firstMsg.reference_id).select(
        "pickup_location drop_location package_type price"
      );
      reference_type = 0;
    } else if (firstMsg.conversation_for === 1) {
      refDetails = await Ride.findById(firstMsg.reference_id).select(
        "start_location end_location date_time transport_type price"
      );
      reference_type = 1;
    }

    // 🟢 Step 4: Determine chat partner
    const chatPartner =
      String(messages[0].sender_id._id) === String(user_id)
        ? messages[0].receiver_id
        : messages[0].sender_id;

    const contact_details = {
      id: chatPartner._id,
      user_name: `${chatPartner.first_name} ${chatPartner.last_name}`,
      contact_number: chatPartner.phone_number,
      reference_id: firstMsg.reference_id || "",
    };

    // 🟢 Step 5: Conversation logs
    const conversation_log = messages.map((msg) => ({
      conversation: msg.message,
      conversation_date: moment(msg.createdAt).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A"),
      conversation_id: msg.conversation_id,
      direction:
        String(msg.sender_id._id) === String(user_id) ? "outbound" : "inbound",
      is_read: msg.is_read ? 1 : 0,
    }));

    // 🟢 Step 6: Reference info formatted
    const reference_details = {
      _id: refDetails?._id || "",
      reference_id: firstMsg.reference_id || "",
      reference_type,
      pickup_location:
        refDetails?.pickup_location || refDetails?.start_location || "",
      drop_location:
        refDetails?.drop_location || refDetails?.end_location || "",
      price: refDetails?.price || 0,
    };

    // ✅ Final response
    return res.status(200).json({
      status: "success",
      message: "Data fetched successfully",
      data: {
        contact_details,
        reference_details,
        conversation_log,
      },
    });
  } catch (error) {
    console.error("❌ getMessages error:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
      error: error.message,
      data: [],
    });
  }
};




// Get conversation list for logged-in user
// export const getConversationList = async (req, res) => {
//   try {
//     const loggedUserId = req.body.user_id; // 🔹 Or req.user.id if using auth middleware
//     if (!loggedUserId) {
//       return res.status(400).json({ status: "fail", message: "User ID required", data:[] });
//     }

//     const loggedUserObjectId = new mongoose.Types.ObjectId(loggedUserId);

//     // 🔹 Step 1: Aggregate to get last message per conversation
//     const conversations = await Chat.aggregate([
//       {
//         $match: {
//           $or: [
//             { sender_id: loggedUserObjectId },
//             { receiver_id: loggedUserObjectId }
//           ]
//         }
//       },
//       { $sort: { createdAt: -1 } },
//       {
//         $group: {
//           _id: "$conversation_id",
//           last_message: { $first: "$message" },
//           conversation_for: { $first: "$conversation_for" },
//           reference_id: { $first: "$reference_id" },
//           sender_id: { $first: "$sender_id" },
//           receiver_id: { $first: "$receiver_id" },
//           unread_count: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     { $eq: ["$receiver_id", loggedUserObjectId] },
//                     { $gt: ["$unread_count", 0] }
//                   ]
//                 },
//                 "$unread_count",
//                 0
//               ]
//             }
//           },
//           updatedAt: { $first: "$createdAt" }
//         }
//       },
//       { $sort: { updatedAt: -1 } }
//     ]);

//     // 🔹 Step 2: Populate chat_partner & reference details
//     const result = await Promise.all(
//       conversations.map(async (conv) => {
//         const chatPartnerId =
//           conv.sender_id.toString() === loggedUserId
//             ? conv.receiver_id
//             : conv.sender_id;

//         const chat_partner = await User.findById(chatPartnerId).select(
//           "first_name last_name"
//         );
//         const user_name = `${chat_partner.first_name} ${chat_partner.last_name}`;

//         let reference_details = null;
//         if (conv.conversation_for === "package") {
//           reference_details = await Package.findById(conv.reference_id).select(
//             "pickup_location drop_location date_time price package_type package_size"
//           );
//         } else if (conv.conversation_for === "ride") {
//           reference_details = await Ride.findById(conv.reference_id).select(
//             "start_location end_location date_time"
//           );
//         }

//         return {
//           conversation_id: conv._id,
//           conversation_for: conv.conversation_for,
//           user_name,
//           last_message: conv.last_message,
//           unread_count: conv.unread_count,
//           created_time: conv.created_time,
//           reference_details,
//         };
//       })
//     );

//     res.status(200).json({
//       status: "success",
//       message:"Data fetched successfully",
//       data: {result,count: result.length},
//     });
//   } catch (error) {
//     console.error("Error fetching conversation list:", error);
//     res.status(500).json({ status: "fail", message: error.message, data:[] });
//   }
// };


export const getConversationList = async (req, res) => {
  try {
    const { user_id: loggedUserId, is_read } = req.query;

    if (!loggedUserId) {
      return res.status(400).json({
        status: "fail",
        message: "User ID required",
        data: [],
      });
    }

    const loggedUserObjectId = new mongoose.Types.ObjectId(loggedUserId);

    // ✅ Step 1: If is_read=1 → mark all unread messages as read for this user
    if (parseInt(is_read) === 1) {
      await Chat.updateMany(
        {
          receiver_id: loggedUserObjectId,
          is_read: 0,
        },
        { $set: { is_read: 1 } }
      );
    }

    // 🔹 Step 2: Aggregate conversations
    const conversations = await Chat.aggregate([
      {
        $match: {
          $or: [
            { sender_id: loggedUserObjectId },
            { receiver_id: loggedUserObjectId },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversation_id",
          last_message: { $first: "$message" },
          conversation_for: { $first: "$conversation_for" },
          reference_id: { $first: "$reference_id" },
          sender_id: { $first: "$sender_id" },
          receiver_id: { $first: "$receiver_id" },
          is_read: { $first: "$is_read" },
          updated_time: { $first: "$createdAt" },
          created_time: { $last: "$createdAt" },
          unread_count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver_id", loggedUserObjectId] },
                    { $eq: ["$is_read", 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { updated_time: -1 } },
    ]);

    // 🔹 Step 3: Populate user & reference details
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const chatPartnerId =
          conv.sender_id.toString() === loggedUserId
            ? conv.receiver_id
            : conv.sender_id;

        const chat_partner = await User.findById(chatPartnerId).select(
          "first_name last_name profile_image badge is_verified_user phone_number"
        );
        const host = `${req.protocol}://${req.get("host")}`;
        const user_name = chat_partner
          ? `${chat_partner.first_name} ${chat_partner.last_name}`
          : "Unknown User";

        const profile_image = chat_partner?.profile_image
          ? `${host}/uploads/profile_images/${chat_partner.profile_image}`
          : null;

        let reference_details = null;
        if (conv.conversation_for === 0) {
          reference_details = await Package.findById(conv.reference_id).select(
            "pickup_location drop_location date_time price package_type package_size"
          );
        } else if (conv.conversation_for === 1) {
          reference_details = await Ride.findById(conv.reference_id).select(
            "start_location end_location date_time"
          );
        }
        // const formatToIST = (date) =>
        // moment(date).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A");
        // const created_time = formatToIST(conv.created_time);
        // const updated_time = formatToIST(conv.updated_time);
        // const created_time = conv.created_time;
        // const updated_time = conv.updated_time;
        return {
          conversation_id: conv._id,
          conversation_for: conv.conversation_for,
          user_name,
          profile_image,
          last_message: conv.last_message,
          unread_count: conv.unread_count,
          is_read: conv.is_read,
          created_time: moment(conv.created_time).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A"),
          updated_time: moment(conv.updated_time).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A"),
          reference_details,
        };
      })
    );

    // Date range (last 7 days)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const unreadNotificationCount = await Notification.countDocuments({
      receiver_id: loggedUserObjectId,
      is_read: 0,
      status: "active",
      createdAt: { $gte: lastWeek, $lte: today },
    });
    // ✅ Final Response
    res.status(200).json({
      status: "success",
      message: "Conversations fetched successfully",
      unread_notification_count: unreadNotificationCount,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Error fetching conversation list:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};


export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversation_id } = req.body;
    const  receiver_id  = req.user._id;

    if (!conversation_id || !receiver_id) {
      return res.status(400).json({ status: "fail", message: "conversation_id and receiver_id required",data:[] });
    }
    console.log(conversation_id,'-', receiver_id);

    const result = await Chat.updateMany(
      { conversation_id, receiver_id,is_read: 0, status: "active" },
      { $set: { is_read: 1, unread_count: 0 } }
    );
    console.log(result);
    
    res.status(200).json({
      status: "success",
      message: "Messages marked as read",
      data: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ status: "fail", message: error.message });
  }
};


export const deleteMessage = async (req, res) => {
  try {
    const { message_id} = req.body;
    const user_id = req.user._id;
    if (!message_id || !user_id) {
      return res.status(400).json({ status: "fail", message: "message_id and user_id required",data:[] });
    }

    const message = await Chat.find(message_id);
    if (!message) {
      return res.status(404).json({ status: "fail", message: "Message not found" , data:[]});
    }

    // Optional: check if user is sender
    if (message.sender_id.toString() !== user_id.toString()) {
      return res.status(403).json({ status: "fail", message: "You can only delete your own messages",data:[] });
    }

    message.status = "deleted";
   const deleteMsg = await message.save();

    res.status(200).json({
      status: "success",
      message: "Message deleted successfully",
      data:deleteMsg
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ status: "fail", message: error.message, data:[] });
  }
};
