// models/Conversation.js
import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String },
  avatar_image: { type: String },
  unread_count: { type: Number, default: 0 },
  is_online: { type: Boolean, default: false }
});

const ConversationSchema = new mongoose.Schema({
  conversation_for: { type: String, enum: ["ride", "package"], required: true },
  ref_id: { // reference to ride or package _id
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  participants: [ParticipantSchema],
  last_message: { type: String, default: "" },
  last_message_time: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("Conversation", ConversationSchema);
