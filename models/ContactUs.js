// models/ContactUs.js

import mongoose from "mongoose";

const contactUsSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// ✅ IMPORTANT: Force collection name = contact_us
export default mongoose.model("contact_us", contactUsSchema, "contact_us");