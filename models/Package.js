import mongoose from "mongoose";
import moment from "moment";

const packageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    departure_location: { type: String, required: true },
    departure_lat: { type: Number, required: true },
    departure_long: { type: Number, required: true },

    dest_location: { type: String, required: true },
    dest_lat: { type: Number, required: true },
    dest_long: { type: Number, required: true },

    description: { type: String },
    package_type: { type: String, required: true }, // e.g. document, parcel
    package_weight: { type: Number, required: true }, // in kg
    package_dimension: { type: String }, // e.g. 10x20x30 cm

    package_date: { type: Date, required: true },
    package_time: { type: String, required: true }, // e.g. "14:30"

    pickup_user: { type: String, required: true },
    pickup_number: { type: String, required: true },

    drop_off_user: { type: String, required: true },
    drop_off_name: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

packageSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
packageSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

const Package = mongoose.model("Package", packageSchema);
export default Package;
