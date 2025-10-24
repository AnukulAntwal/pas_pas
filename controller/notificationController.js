import Notification from "../models/Notification.js";
import Chat from "../models/Chat.js";

export const sendMessageNotification = async (req, res) => {
  try {
    const { sender_id, receiver_id, conversation_id, reference_id, message } = req.body;

    if (!sender_id || !receiver_id || !conversation_id || !message) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields",
        data:[]
      });
    }

    // ✅ Create new notification
    const newNotification = await Notification.create({
      sender_id,
      receiver_id,
      conversation_id,
      reference_id,
      message_text: message,
      type: "message",
    });

    res.status(200).json({
      status: "success",
      message: "Message notification sent successfully",
      data: newNotification,
    });
  } catch (error) {
    console.error("Error sending message notification:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data:[]
    });
  }
};


export const getNotifications = async (req, res) => {
  try {
    const { user_id,is_read } = req.query;
    if (!user_id) {
      return res.status(400).json({
        status: "fail",
        message: "User ID is required",
        data: [],
      });
    }
       //  Step 1: If is_read = 1 → mark all unread notifications as read
    if (is_read == 1) {
      await Notification.updateMany(
        { receiver_id: user_id, is_read: 0 },
        { $set: { is_read: 1 } }
      );
    }

    const today = new Date(); // current date
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7); // 7 days ago

    const notifications = await Notification.find({
      receiver_id: user_id,
      status: "active",
      createdAt: { $gte: lastWeek, $lte: today }, // filter by date
    })
      .populate("sender_id", "first_name last_name phone_number")
      .sort({ createdAt: -1 });

    // Format for response
    const formatted = notifications.map((notif) => ({
    notification_id: notif._id,
    message: notif.message_text, 
    sender_name: notif.sender_id
        ? `${notif.sender_id.first_name} ${notif.sender_id.last_name}`
        : "Unknown",
    sender_phone: notif.sender_id?.phone_number || "",
    is_read: notif.is_read,
    created_time: notif.createdAt,
    }));


    res.status(200).json({
      status: "success",
      message: "Notifications fetched successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};
