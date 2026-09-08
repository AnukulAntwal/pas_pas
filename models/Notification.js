import mongoose from "mongoose";
import moment from "moment";

const notificationSchema = new mongoose.Schema(
  {
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["message", "parcel", "transport", "booking", "system"], default: "message" },
    message_text: { type: String, default: "" },
    message_type: { type: String, default: "" },
    conversation_id: { type: Number, default: null },
    reference_id: { type: mongoose.Schema.Types.ObjectId },
    is_read: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "deleted"], default: "active" },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

notificationSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
notificationSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 5 }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
