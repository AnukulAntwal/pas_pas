import mongoose from "mongoose";
import moment from "moment";
// import { Number } from "joi";

const chatSchema = new mongoose.Schema({
  conversation_id: { type: Number },
  conversation_for: { type: String, enum: ["ride", "package"], required: true },
  reference_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  unread_count: { type: Number, default: 0 },

  // ✅ New fields
  is_read: { type: Number, default: 0 }, // message read hua ya nahi
  status: { type: String, enum: ["active", "deleted"], default: "active" }, // delete flag
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
});

chatSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
chatSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
