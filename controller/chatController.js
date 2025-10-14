import Chat from "../models/Chat.js";
import mongoose from "mongoose";

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { sender_id, receiver_id, conversation_for, message, conversation_id } = req.body;

    // ✅ Validation
    if (!sender_id || !receiver_id || !conversation_for || !message) {
      return res.status(400).json({
        status: "fail",
        message: "sender_id, receiver_id, conversation_for, and message are required"
      });
    }

    let convId = conversation_id;

    // Agar conversation_id nahi hai, check agar already exist karti hai same sender & receiver + conversation_for
    if (!convId) {
      const existingChat = await Chat.findOne({
        $or: [
          { sender_id, receiver_id, conversation_for },
          { sender_id: receiver_id, receiver_id: sender_id, conversation_for }
        ]
      }).sort({ createdAt: -1 });

      convId = existingChat ? existingChat.conversation_id : undefined;
    }

    // ✅ Create chat
    const newChat = new Chat({
      conversation_id: convId,
      sender_id,
      receiver_id,
      conversation_for,
      message,
      unread_count: 1
    });

    const savedChat = await newChat.save();

    res.status(200).json({
      status: "success",
      message: "Message sent successfully",
      data: savedChat
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
      error: error.message
    });
  }
};
