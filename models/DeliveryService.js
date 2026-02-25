import mongoose from "mongoose";
import moment from "moment";

const deliveryServiceSchema = new mongoose.Schema(
  {
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    start_location: { type: String, required: true },
    start_lat: { type: Number, required: true },
    start_long: { type: Number, required: true },

    end_location: { type: String, required: true },
    end_lat: { type: Number, required: true },
    end_long: { type: Number, required: true },

    route_path: [
      {
        lat: { type: Number },
        long: { type: Number },
        _id: false
      },
    ],

    route_polyline: { type: String },
    
    transport_type: { type: String, required: true },
    price: { type: Number },
    contact_number: { type: String, required: true },
    description: { type: String },

    date_time: { type: Date, required: true },
    
    booking_type: {
      type: String,
      enum: ["Booked", "Cancelled", "Available"],
      default: "Available"
    },
    
    is_available: { type: Number, default: 1 },
    cancel_reason: { type: String },
    
    booked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    is_delivery_counted: {
      type: Boolean,
      default: false
    },
    is_completed: { type: Number, default: 0 },
    is_rated: { type: Number, default: 0 },
    // ✅ CORRECT: TTL field for auto-deletion
    expiresAt: {
      type: Date,
      required: true,
      // Index will be created separately
    },
  },  
  
  {  
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// ✅ Create TTL Index - MongoDB will auto-delete documents when expiresAt time passes
deliveryServiceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Getters for formatting dates
deliveryServiceSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

deliveryServiceSchema.path("date_time").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

deliveryServiceSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

// ✅ Pre-save hook: Calculate expiresAt = date_time + 15 days
deliveryServiceSchema.pre("validate", function (next) {
  if (!this.expiresAt && this.date_time) {
    const expiryDate = new Date(this.date_time);
    expiryDate.setDate(expiryDate.getDate() + 15);
    this.expiresAt = expiryDate;
  }
  next();
});


const DeliveryService = mongoose.model("DeliveryService", deliveryServiceSchema);
export default DeliveryService;