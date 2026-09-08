import Notification from "../models/Notification.js";
import moment from "moment-timezone";
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
    const { user_id, is_read } = req.query;

    if (!user_id) {
      return res.status(400).json({
        status: "fail",
        message: "User ID is required",
        data: [],
      });
    }

    // If is_read=1 → mark all unread notifications as read
    if (is_read == 1) {
      await Notification.updateMany(
        { receiver_id: user_id, is_read: 0 },
        { $set: { is_read: 1 } }
      );
    }

    // Date range (last 7 days)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    // Common filter for logged user
    const filter = {
      receiver_id: user_id,
      status: "active",
      createdAt: { $gte: lastWeek, $lte: today },
    };

    // Get total and unread count together
    const [totalCount, unreadCount] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, is_read: 0 }),
    ]);

    // Get notifications list
    const notifications = await Notification.find(filter)
      .populate("sender_id", "first_name last_name phone_number badge is_verified_user")
      .sort({ createdAt: -1 });

    const formatted = notifications.map((notif) => ({
      notification_id: notif._id,
      message: notif.message_text,
      message_type: notif.message_type,
      sender_name: notif.sender_id
        ? `${notif.sender_id.first_name} ${notif.sender_id.last_name}`
        : "Unknown",
      sender_phone: notif.sender_id?.phone_number || "",
      is_read: notif.is_read,
      created_time: moment(notif.createdAt)
        .tz("Asia/Kolkata")
        .format("DD MMM YYYY, hh:mm A"),
    }));

    return res.status(200).json({
      status: "success",
      message: "Notifications fetched successfully",
      total_count: totalCount,
      unread_count: unreadCount,
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
