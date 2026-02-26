import mongoose from "mongoose";
import moment from "moment";

const packageSchema = new mongoose.Schema(
  {
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",   // 🔗 Linked to the user who created the package
      required: true,
    },

    package_type: { type: String, required: true }, // e.g. document, parcel
    package_size: { type: String, required: true }, // e.g. small, medium, large
    description: { type: String },

    pickup_location: { type: String, required: true },
    pickup_lat: { type: Number, required: true },
    pickup_long: { type: Number, required: true },

    drop_location: { type: String, required: true },
    drop_lat: { type: Number, required: true },
    drop_long: { type: Number, required: true },
    
    sender_name: { type: String, required: true },
    receiver_name: { type: String, required: true },
    
    route_path: [
      {
        lat: { type: Number },
        long: { type: Number },
        _id: false
      },
    ],
    road_stops: [
      {
        city: { type: String },
        lat: { type: Number },
        long: { type: Number },
        _id: false,
      },
    ],

    date_time: { type: Date, required: true },

    sender_contact_number: { type: String, required: true },
    receiver_contact_number: { type: String, required: true },

    price: { type: Number, required: true },

    is_signature_required: { type: Boolean, default: false },
    
    booking_type: {
      type: String,
      enum: ["Booked", "Cancelled", "Available"],
      default: "Available"
    },
    
    is_available: { type: Number, default: 1 },
    is_completed: { type: Number, default: 0 },
    cancel_reason: { type: String },

    booked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    // ✅ TTL field for auto-deletion
    expiresAt: {
      type: Date,
      // TTL index will be created separately
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

// ✅ Create TTL Index - Auto-delete when expiresAt time passes
packageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ✅ Format dates in response
packageSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

packageSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

packageSchema.path("date_time").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

// ✅ Pre-save hook: Calculate expiresAt = date_time + 15 days
packageSchema.pre("save", function (next) {
  // Only calculate if this is a new document OR if date_time changed
  if (this.isNew || this.isModified("date_time")) {
    // Calculate expiry: date_time + 15 days
    const expiryDate = new Date(this.date_time);
    expiryDate.setDate(expiryDate.getDate() + 15);
    this.expiresAt = expiryDate;
  }
  next();
});

const Package = mongoose.model("Package", packageSchema);
export default Package;