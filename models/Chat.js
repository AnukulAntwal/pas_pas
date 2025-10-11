// models/Chat.js
import mongoose from "mongoose";
import moment from "moment";

const chatSchema = new mongoose.Schema({
  ride_id: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryService", default: null },
  package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package", default: null },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// format createdAt
chatSchema.path("createdAt").get(function(date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
