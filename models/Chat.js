import mongoose from "mongoose";
import moment from "moment";
import { v4 as uuidv4 } from "uuid"; // for unique conversation_id

const chatSchema = new mongoose.Schema({
  conversation_id: { 
    type: String,
    default: function() {
      return uuidv4(); // agar first message hai to unique conversation ID generate kare
    }
  },
  conversation_for: { 
    type: String, 
    enum: ["ride", "package"], 
    required: true 
  },
  sender_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  receiver_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  unread_count: { 
    type: Number, 
    default: 1 
  },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
});

// format createdAt
chatSchema.path("createdAt").get(function(date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

// format updatedAt
chatSchema.path("updatedAt").get(function(date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
