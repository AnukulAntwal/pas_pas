import Chat from "./models/Chat.js";
import mongoose from "mongoose";

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    // 🏷 Join a conversation room
    socket.on("joinConversation", ({ conversation_id }) => {
      if (conversation_id) {
        socket.join(conversation_id);
        console.log(`Socket ${socket.id} joined conversation: ${conversation_id}`);
      }
    });

    // 📨 Send a new message
    socket.on("sendMessage", async (data) => {
      try {
        // Save message in DB
        const newMessage = new Chat({
          ...data,
          unread_count: 1,
          status: "active"
        });
        const savedMessage = await newMessage.save();

        // Emit to everyone in this conversation room
        io.to(data.conversation_id).emit("receiveMessage", savedMessage);
      } catch (error) {
        console.error("Socket sendMessage error:", error);
      }
    });

    // ✅ Mark message as read
    socket.on("markAsRead", async ({ message_id }) => {
      try {
        const message = await Chat.findByIdAndUpdate(
          message_id,
          { unread_count: 0 },
          { new: true }
        );

        if (message) {
          io.to(message.conversation_id).emit("messageRead", message);
        }
      } catch (error) {
        console.error("Socket markAsRead error:", error);
      }
    });

    // 🗑 Soft delete message
    socket.on("deleteMessage", async ({ message_id }) => {
      try {
        const message = await Chat.findByIdAndUpdate(
          message_id,
          { status: "deleted" },
          { new: true }
        );

        if (message) {
          io.to(message.conversation_id).emit("messageDeleted", message);
        }
      } catch (error) {
        console.error("Socket deleteMessage error:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

export default initSocket;
