import mongoose from "mongoose";

const appVersionSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["ANDROID", "IOS"],
      required: true
    },

    latest_version: {
      type: String,
      required: true
    },

    minimum_supported_version: {
      type: String,
      required: true
    },

    force_update: {
      type: Boolean,
      default: false
    },

    update_url: {
      type: String,
      required: true
    },

    message: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export default mongoose.model("AppVersion", appVersionSchema);
