// controllers/chatController.js
import Chat from "../models/Chat.js";
import { v4 as uuidv4 } from "uuid";
import Package from "../models/Package.js"; // 👈 define if exists
import Ride from "../models/DeliveryService.js"; 
import User from "../models/User.js";
import mongoose from "mongoose";

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

    // ✅ Generate new conversation_id if not provided
    const finalConversationId =
      conversation_id || `${conversation_for}_${uuidv4()}`;

    const newMessage = new Chat({
      conversation_id: finalConversationId,
      conversation_for,
      reference_id,
      sender_id,
      receiver_id,
      message,
      unread_count: 1,
    });

    await newMessage.save();

    res.status(200).json({
      status: "success",
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      status: "fail",
      error: error.message,
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversation_id } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ success: "fail", message: "conversation_id required" });
    }

    // 🔹 Find all messages of this conversation
    const messages = await Chat.find({ conversation_id, status: "active" })
      .populate("sender_id", "first_name last_name email phone_number")  // sender info
      .populate("receiver_id", "first_name last_name email phone_number") // receiver info
      .sort({ createdAt: 1 }); // oldest first

    if (!messages.length) {
      return res.status(200).json({ success: "success", message: "No messages found",data:[] });
    }

    // 🔹 Get the first message to identify conversation type & reference
    const firstMsg = messages[0];
    let refDetails = null;

    if (firstMsg.conversation_for === "package") {
      refDetails = await Package.findById(firstMsg.reference_id)
        .select("pickup_location drop_location package_type price");
    } else if (firstMsg.conversation_for === "ride") {
      refDetails = await Ride.findById(firstMsg.reference_id)
        .select("start_location end_location date_time transport_type");
    }

    return res.status(200).json({
      success: "success",
      data:{
        reference_details: refDetails,
        messages,
        conversation_for: firstMsg.conversation_for,
      }
    });

  } catch (error) {
    console.error("❌ getMessages error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// Get conversation list for logged-in user
export const getConversationList = async (req, res) => {
  try {
    const loggedUserId = req.body.user_id; // 🔹 Or req.user.id if using auth middleware
    if (!loggedUserId) {
      return res.status(400).json({ status: "fail", message: "User ID required" });
    }

    const loggedUserObjectId = new mongoose.Types.ObjectId(loggedUserId);

    // 🔹 Step 1: Aggregate to get last message per conversation
    const conversations = await Chat.aggregate([
      {
        $match: {
          $or: [
            { sender_id: loggedUserObjectId },
            { receiver_id: loggedUserObjectId }
          ]
        }
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
          unread_count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver_id", loggedUserObjectId] },
                    { $gt: ["$unread_count", 0] }
                  ]
                },
                "$unread_count",
                0
              ]
            }
          },
          updatedAt: { $first: "$createdAt" }
        }
      },
      { $sort: { updatedAt: -1 } }
    ]);

    // 🔹 Step 2: Populate chat_partner & reference details
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const chatPartnerId =
          conv.sender_id.toString() === loggedUserId
            ? conv.receiver_id
            : conv.sender_id;

        const chat_partner = await User.findById(chatPartnerId).select(
          "first_name last_name phone_number"
        );

        let reference_details = null;
        if (conv.conversation_for === "package") {
          reference_details = await Package.findById(conv.reference_id).select(
            "pickup_location drop_location date_time price package_type package_size"
          );
        } else if (conv.conversation_for === "ride") {
          reference_details = await Ride.findById(conv.reference_id).select(
            "start_location end_location date_time"
          );
        }

        return {
          conversation_id: conv._id,
          conversation_for: conv.conversation_for,
          chat_partner,
          last_message: conv.last_message,
          unread_count: conv.unread_count,
          reference_details,
        };
      })
    );

    res.status(200).json({
      status: "success",
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching conversation list:", error);
    res.status(500).json({ status: "fail", message: error.message });
  }
};


export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversation_id, receiver_id } = req.body;

    if (!conversation_id || !receiver_id) {
      return res.status(400).json({ status: "fail", message: "conversation_id and receiver_id required" });
    }

    const result = await Chat.updateMany(
      { conversation_id, receiver_id, is_read: false, status: "active" },
      { $set: { is_read: true, unread_count: 0 } }
    );

    res.status(200).json({
      status: "success",
      message: "Messages marked as read",
      updated_count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ status: "fail", message: error.message });
  }
};


export const deleteMessage = async (req, res) => {
  try {
    const { message_id, user_id } = req.body;

    if (!message_id || !user_id) {
      return res.status(400).json({ status: "fail", message: "message_id and user_id required" });
    }

    const message = await Chat.findById(message_id);
    if (!message) {
      return res.status(404).json({ status: "fail", message: "Message not found" });
    }

    // Optional: check if user is sender
    if (message.sender_id.toString() !== user_id.toString()) {
      return res.status(403).json({ status: "fail", message: "You can only delete your own messages" });
    }

    message.status = "deleted";
    await message.save();

    res.status(200).json({
      status: "success",
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ status: "fail", message: error.message });
  }
};
