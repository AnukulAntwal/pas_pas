import cron from "node-cron";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import DeliveryService from "../models/DeliveryService.js";
import Package from "../models/Package.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

cron.schedule("*/5 * * * *", async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 🔍 Only unprocessed bookings
    const bookings = await Booking.find({
      is_booked: 1,
      booking_type: "Booked",
      is_counted: false
    });

    console.log("📦 Bookings found:", bookings.length);

    for (const booking of bookings) {
      let isCompleted = false;
      let ownerId = null;

      const refId = new mongoose.Types.ObjectId(booking.reference_id);

      // =========================
      // 🚚 DELIVERY SERVICE
      // =========================
      if (booking.type === 1) {
        const delivery = await DeliveryService.findById(refId);

        if (
          delivery &&
          delivery.date_time &&
          new Date(delivery.date_time).getTime() <= oneHourAgo.getTime()
        ) {
          // ✅ Mark completed only once
          if (delivery.is_completed === 0) {
            delivery.is_completed = 1;
            delivery.is_available = 0;
            await delivery.save();
            console.log("✅ Delivery completed:", delivery._id);
          }

          isCompleted = true;
          ownerId = delivery.uid;
        }
      }

      // =========================
      // 📦 PACKAGE
      // =========================
      if (booking.type === 0) {
        const pkg = await Package.findById(refId);

        if (
          pkg &&
          pkg.date_time &&
          new Date(pkg.date_time).getTime() <= oneHourAgo.getTime()
        ) {
          // ✅ Mark completed only once
          if (pkg.is_completed === 0) {
            pkg.is_completed = 1;
            await pkg.save();
            console.log("📦 Package completed:", pkg._id);
          }

          isCompleted = true;
          ownerId = pkg.uid;
        }
      }

      // =========================
      // 🎯 FINAL UPDATE
      // =========================
      if (isCompleted && ownerId) {

        // ✅ Owner count increase (only once)
        await User.findByIdAndUpdate(
          ownerId,
          { $inc: { no_of_delivery: 1 } }
        );

        // ✅ Disable full chat conversation
        if (booking.conversation_id !== null && booking.conversation_id !== undefined) {
          await Chat.updateMany(
            { conversation_id: booking.conversation_id },
            { $set: { is_disabled: 1 } }
          );
        }

        // ✅ Prevent duplicate processing
        booking.is_counted = true;
        await booking.save();

        console.log("🔥 Booking processed:", booking._id);
      }
    }

    console.log("✅ Cron executed successfully");

  } catch (err) {
    console.error("❌ Cron error:", err);
  }
});