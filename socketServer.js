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
        console.error(" Error sending message:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("getMessages", async ({ conversation_id, user_id, is_read }) => {
    try {
        if (!conversation_id || !user_id) {
        return socket.emit("error", {
            message: "conversation_id and user_id are required",
        });
        }

        // 🟢 Step 1: Update messages as read only if is_read=1
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
        .populate("sender_id", "first_name last_name email phone_number")
        .populate("receiver_id", "first_name last_name email phone_number")
        .sort({ updatedAt: -1 });

        if (!messages.length) {
        return socket.emit("conversationMessages", {
            status: "fail",
            message: "No messages found",
            data: [],
        });
        }

        // 🟢 Step 3: Get reference details
        const firstMsg = messages[0];
        let refDetails = null;
        let reference_type = "";

        if (firstMsg.conversation_for === "package") {
        refDetails = await Package.findById(firstMsg.reference_id).select(
            "pickup_location drop_location package_type price"
        );
        reference_type = "package";
        } else if (firstMsg.conversation_for === "ride") {
        refDetails = await Ride.findById(firstMsg.reference_id).select(
            "start_location end_location date_time transport_type"
        );
        reference_type = "ride";
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
        conversation_date: moment(msg.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
        conversation_id: msg.conversation_id,
        direction:
            String(msg.sender_id._id) === String(user_id) ? "outbound" : "inbound",
        is_read: msg.is_read ? 1 : 0,
        }));

        // 🟢 Step 6: Reference details formatted
        const reference_details = {
        _id: refDetails?._id || "",
        reference_id: firstMsg.reference_id || "",
        reference_type,
        pickup_location:
            refDetails?.pickup_location || refDetails?.start_location || "",
        drop_location:
            refDetails?.drop_location || refDetails?.end_location || "",
        price: refDetails?.price || "",
        };

        // ✅ Final emit back to the user
        socket.emit("conversationMessages", {
        status: "success",
        message: "Messages fetched successfully",
        data: {
            contact_details,
            reference_details,
            conversation_log,
        },
        });
    } catch (err) {
        console.error("❌ Error getting messages:", err);
        socket.emit("error", { message: "Failed to fetch messages", error: err.message });
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