import mongoose from "mongoose";
import Counter from "../models/Counter.js"
import moment from "moment";

const packageLocationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // user se relation
    //   required: true,
    },

    // packageId: {
    //   type: Number,   // ya ObjectId agar alag Package schema banate ho
    //   unique: true,
    // },

    pickup: {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      datetime: { type: Date, required: true },
    },

    drop: {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      datetime: { type: Date, required: true },
    },

    status: {
      type: String,
      enum: ["pending","picked_up","on_the_way", "delivered","cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },  // 👈 JSON response me getter apply hoga
    toObject: { getters: true }, 
  }
);

// packageLocationSchema.pre("save", async function (next) {
//   if (this.isNew) {
//     const counter = await Counter.findByIdAndUpdate(
//       { _id: "PackageLocation" },              // counter for users collection
//       { $inc: { seq: 1 } },
//       { new: true, upsert: true }
//     );
//     this.id = counter.seq;
//   }
//   next();
// });

packageLocationSchema.path("createdAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});

packageLocationSchema.path("updatedAt").get(function (date) {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
});
const PackageLocation = mongoose.model("PackageLocation", packageLocationSchema);
export default PackageLocation;
