import mongoose from "mongoose";
import moment from "moment";

const deliveryServiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pickup_location: { type: String, required: true },
    pickup_lat: { type: Number, required: true },
    pickup_long: { type: Number, required: true },

    delivery_location: { type: String, required: true },
    delivery_lat: { type: Number, required: true },
    delivery_long: { type: Number, required: true },

    service_type: { type: String, required: true },  // e.g. same-day, express
    vehicle_type: { type: String, required: true },  // e.g. bike, car, van
    price_estimate: { type: Number, required: true },

    contact_number: { type: String, required: true },
    package_description: { type: String },

    delivery_date: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

deliveryServiceSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
deliveryServiceSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

const DeliveryService = mongoose.model("DeliveryService", deliveryServiceSchema);
export default DeliveryService;
