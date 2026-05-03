import cron from "node-cron";
import Booking from "../models/Booking.js";
import DeliveryService from "../models/DeliveryService.js";
import Package from "../models/Package.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 🔍 Fetch all active bookings (not yet counted)
    const bookings = await Booking.find({
      is_booked: 1,
      booking_type: "Booked",
      is_counted: false
    });

    for (const booking of bookings) {
      let isCompleted = false;
      let ownerId = null;

      // =========================
      // 🚚 DELIVERY SERVICE
      // =========================
      if (booking.type === 1) {
        const delivery = await DeliveryService.findById(booking.reference_id);

        if (delivery && delivery.date_time <= oneHourAgo) {

          // ✅ Auto mark completed
          if (delivery.is_completed === 0) {
            delivery.is_completed = 1;
            delivery.is_available = 0;
            await delivery.save();
          }

          isCompleted = true;
          ownerId = delivery.uid;
        }
      }

      // =========================
      // 📦 PACKAGE
      // =========================
      if (booking.type === 0) {
        const pkg = await Package.findById(booking.reference_id);

        if (pkg && pkg.date_time <= oneHourAgo) {

          // ✅ Auto mark completed
          if (pkg.is_completed === 0) {
            pkg.is_completed = 1;
            await pkg.save();
          }

          isCompleted = true;
          ownerId = pkg.uid;
        }
      }

      // =========================
      // 🎯 FINAL UPDATE
      // =========================
      if (isCompleted && ownerId) {

        // ✅ Only Owner count increase
        await User.findByIdAndUpdate(
          ownerId,
          { $inc: { no_of_delivery: 1 } }
        );

        // ✅ Disable Chat
        if (booking.conversation_id) {
            await Chat.updateMany(
                { conversation_id: booking.conversation_id },
                { $set: { is_disabled: 1 } }
            );
        }

        // ✅ Mark booking counted (avoid duplicate)
        booking.is_counted = true;
        await booking.save();
      }
    }

    console.log("✅ Booking cron executed (completion + count + chat disable)");

  } catch (err) {
    console.error("❌ Cron error:", err);
  }
});