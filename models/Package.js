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

    date_time: { type: Date, required: true },

    sender_contact_number: { type: String, required: true },
    receiver_contact_number: { type: String, required: true },

    price: { type: Number, required: true },

    is_signature_required: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    id: false, // 👈 removes duplicate virtual id field
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// ✅ Format createdAt & updatedAt in response
packageSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
packageSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

const Package = mongoose.model("Package", packageSchema);
export default Package;
