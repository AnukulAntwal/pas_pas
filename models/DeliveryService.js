import mongoose from "mongoose";
import moment from "moment";

const deliveryServiceSchema = new mongoose.Schema(
  {
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",   // 🔗 user reference
      required: true,
    },

    start_location: { type: String, required: true },
    start_lat: { type: Number, required: true },
    start_long: { type: Number, required: true },

    end_location: { type: String, required: true },
    end_lat: { type: Number, required: true },
    end_long: { type: Number, required: true },

     // 🆕 Store the full path between start and end
    route_path: [
      {
        lat: { type: Number },
        long: { type: Number },
        _id: false
      },
    ],

    // 🆕 Optionally store Google polyline string (compact format)
    route_polyline: { type: String },
    
    transport_type: { type: String, required: true },   // e.g. bike, car, van
    price: { type: Number, required: true },

    contact_number: { type: String, required: true },

    description: { type: String },

    date_time: { type: Date, required: true },
  },
  
  {  
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

deliveryServiceSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
deliveryServiceSchema.path("date_time").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
deliveryServiceSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

const DeliveryService = mongoose.model("DeliveryService", deliveryServiceSchema);
export default DeliveryService;
