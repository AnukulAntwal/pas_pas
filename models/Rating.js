import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    delivery_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryService",
      required: true,
      unique: true // ❗ 1 delivery = 1 rating
    },
    from_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    to_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    review: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("Rating", ratingSchema);
