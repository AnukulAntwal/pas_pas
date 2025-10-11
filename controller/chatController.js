import Chat from "../models/Chat.js";

// 📤 Send message
export const sendMessage = async (req, res) => {
  try {
    const { ride_id, package_id, sender_id, receiver_id, message } = req.body;

    if (!sender_id || !receiver_id || !message || (!ride_id && !package_id)) {
      return res.status(400).json({ status: "fail", message: "Required fields missing" });
    }

    const newChat = new Chat({ ride_id, package_id, sender_id, receiver_id, message });
    const savedMessage = await newChat.save();

    res.status(200).json({ status: "success", data: savedMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ status: "fail", message: error.message });
  }
};

// 📥 Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const { ride_id, package_id } = req.body;

    if (!ride_id && !package_id) {
      return res.status(400).json({ status: "fail", message: "ride_id or package_id required" });
    }

    const chats = await Chat.find({
      ride_id: ride_id || null,
      package_id: package_id || null,
    })
      .sort({ createdAt: 1 })
      .populate("sender_id", "name email")
      .populate("receiver_id", "name email");

    res.json({ status: "success", count: chats.length, data: chats });
  } catch (error) {
    console.error("Error getting chat history:", error);
    res.status(500).json({ status: "fail", message: error.message });
  }
};
