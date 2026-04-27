import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    reference_id: {
      type: String,
      required: true,
    },
    type: {
      type: Number,
      enum: [0, 1], // 0=delivery service ,1= package
    },
    is_booked: {
      type: Number,
      enum: [0, 1], // 0=not booked ,1= booked
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 0
    },
    cancel_reason:{
        type: String,
        default: ''
    },
    conversation_id: {
      type: Number,
      default: null,
    },
    booking_type: {
      type: String,
      enum: ["Booked", "Cancelled"],
      default: ""
    },
    booked_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
