import Chat from "./models/Chat.js";
import Counter from "./models/Counter.js";

// ✅ Generate auto-increment numeric conversation ID
const getNextConversationId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "conversation_id" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return 100 + counter.seq; // start from 101
};

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("⚡ New client connected:", socket.id);

    // ✅ Join user-specific room
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined their personal room`);
    });

    // ✅ Send message
    socket.on("sendMessage", async (data) => {
      try {
        let {
          conversation_id,
          conversation_for,
          reference_id,
          sender_id,
          receiver_id,
          message,
        } = data;

        // 🔹 If no conversation_id → generate new numeric one
        if (!conversation_id) {
          conversation_id = await getNextConversationId();
        }

        // 🔹 Save message
        const chat = new Chat({
          conversation_id,
          conversation_for,
          reference_id,
          sender_id,
          receiver_id,
          message,
          unread_count: 1,
        });
        await chat.save();

        // 🔹 Emit to both users
        io.to(sender_id).emit("messageSent", chat);
        io.to(receiver_id).emit("newMessage", chat);

        console.log(`💬 Message sent in conversation ${conversation_id}`);
      } catch (err) {
        console.error("❌ Error sending message:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ✅ Get all messages of a conversation
    socket.on("getMessages", async ({ conversation_id }) => {
      try {
        const messages = await Chat.find({ conversation_id })
          .sort({ createdAt: 1 })
          .lean();
        socket.emit("conversationMessages", messages);
      } catch (err) {
        console.error("❌ Error getting messages:", err);
        socket.emit("error", { message: "Failed to fetch messages" });
      }
    });

    // ✅ Get conversation list for a user
    socket.on("getConversations", async ({ user_id }) => {
      try {
        const conversations = await Chat.aggregate([
          {
            $match: {
              $or: [{ sender_id: user_id }, { receiver_id: user_id }],
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $group: {
              _id: "$conversation_id",
              lastMessage: { $first: "$message" },
              sender_id: { $first: "$sender_id" },
              receiver_id: { $first: "$receiver_id" },
              unread_count: { $sum: "$unread_count" },
              updatedAt: { $first: "$createdAt" },
            },
          },
          { $sort: { updatedAt: -1 } },
        ]);

        socket.emit("conversationList", conversations);
      } catch (err) {
        console.error("❌ Error getting conversations:", err);
        socket.emit("error", { message: "Failed to fetch conversations" });
      }
    });

    // ✅ Mark messages as read
    socket.on("markAsRead", async ({ conversation_id, user_id }) => {
      try {
        await Chat.updateMany(
          { conversation_id, receiver_id: user_id, unread_count: 1 },
          { $set: { unread_count: 0 } }
        );
        socket.emit("markedAsRead", { conversation_id });
      } catch (err) {
        console.error("❌ Error marking read:", err);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    // ✅ Soft delete message (status field required in Chat model)
    socket.on("deleteMessage", async ({ message_id }) => {
      try {
        await Chat.findByIdAndUpdate(message_id, { status: "deleted" });
        socket.emit("messageDeleted", { message_id });
      } catch (err) {
        console.error("❌ Error deleting message:", err);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};

export default initSocket;