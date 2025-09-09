import mongoose from "mongoose";
import Counter from "../models/Counter.js"

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },  // ✅ integer id
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone_number: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10}$/, // 10 digit number validation
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 3,
    },
     device_type: {
      type: String,
    },
     device_token: {
      type: String,
    },
    last_login:{
      type: Date
    },
    
  },  
  {
    timestamps: true ,
    versionKey: false     // ✅ removes "__v"

  }
);

// ✅ pre-save hook to auto increment ID
userSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "users" },              // counter for users collection
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.id = counter.seq;
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
