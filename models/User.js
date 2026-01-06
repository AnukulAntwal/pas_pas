import mongoose from "mongoose";
import Counter from "../models/Counter.js"
import moment from "moment";

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
    token:{
      type:String
    },
    profile_image: {
    type: String,
    default: null,
    },
    pincode: {
    type: Number,
    default: null,
    },
    city: {
    type: String,
    default: null,
    },
    state: {
    type: String,
    default: null,
    },
    aadhar_number: {
      type: String,
      unique: true,
      sparse: true,      // ✅ allows multiple null values
      match: /^[0-9]{12}$/, // Aadhaar = 12 digits
      default: null,
    },
    pan_number: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, // PAN format
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    is_valid_adhar: {
      type: Number,
      enum: [0, 1],
      default: 0, // ✅ default 0
    },
    is_valid_pan: {
      type: Number,
      enum: [0, 1],
      default: 0, // ✅ default 0
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },    
  },  
  {
    timestamps: true ,
    versionKey: false,     // ✅ removes "__v"
    toJSON: { getters: true },  // 👈 JSON response me getter apply hoga
    toObject: { getters: true }, 
  }
);

// ✅ pre-save hook to auto increment ID
// userSchema.pre("save", async function (next) {
//   if (this.isNew) {
//     const counter = await Counter.findByIdAndUpdate(
//       { _id: "users" },              // counter for users collection
//       { $inc: { seq: 1 } },
//       { new: true, upsert: true }
//     );
//     this.id = counter.seq;
//   }
//   next();
// });

userSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

userSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

const User = mongoose.model("User", userSchema);
export default User;
