import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["SUPPORT", "BUG", "FEEDBACK"],
      required: true
    },

    subject: {
      type: String,
      trim: true
    },

    message: {
      type: String,
      required: true
    },

    app_version: {
      type: String
    },

    platform: {
      type: String,
    },

    device_info: {
      type: String
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    user_name: {
      type: String
    },

    user_email: {
      type: String
    },

    status: {
      type: String,
      enum: [0,1,2], // 0=OPEN, 1=IN_PROGRESS, 2=CLOSED
      default: 0
    }
  },
  { timestamps: true }
);
supportSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

supportSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
export default mongoose.model("SupportTicket", supportSchema);
