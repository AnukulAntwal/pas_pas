import cron from "node-cron";
import DeliveryService from "../models/DeliveryService.js";
import User from "../models/User.js";

cron.schedule("*/20 * * * *", async () => {
  try {
    const now = new Date();

    // date_time + 1 hour <= now
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const deliveries = await DeliveryService.find({
      is_delivery_counted: false,
      is_completed: 0,
      date_time: { $lte: oneHourAgo }
    });

    for (const delivery of deliveries) {
      // ✅ Increment user delivery count
      await User.findByIdAndUpdate(
        delivery.uid,
        { $inc: { no_of_delivery: 1 } }
      );

      // ✅ Mark delivery as counted & completed
      delivery.is_delivery_counted = true;
      delivery.is_completed = 1;

      await delivery.save();
    }

    if (deliveries.length > 0) {
      console.log(`✅ ${deliveries.length} deliveries marked completed`);
    }

  } catch (err) {
    console.error("❌ Cron error:", err);
  }
});
