import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
    hpassword: {
      type: String,
      required: true,
      minlength: 5,
    },
  },
  { timestamps: true } // createdAt, updatedAt auto
);

const User = mongoose.model("User", userSchema);
export default User;
