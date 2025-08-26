import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  phone_number: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  device_token: { type: String, default: "" },
  device_type: { type: String, default: "" } 
}, { timestamps: true });

export default mongoose.model("User", userSchema);
