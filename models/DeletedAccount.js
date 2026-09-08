import mongoose from "mongoose";

const deletedAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // ek email baar-baar store na ho
      lowercase: true,
      trim: true
    },
    deleted_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

export default mongoose.model("DeletedAccount", deletedAccountSchema);