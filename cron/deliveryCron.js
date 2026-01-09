import cron from "node-cron";
import DeliveryService from "../models/DeliveryService.js";
import User from "../models/User.js";

cron.schedule("*/20 * * * *", async () => {
  try {
    const now = new Date();

    const deliveries = await DeliveryService.find({
      is_delivery_counted: false,
      date_time: {
        $lte: new Date(now.getTime() - 60 * 60 * 1000) // +1 hour
      }
    });

    for (const delivery of deliveries) {
      await User.findByIdAndUpdate(
        delivery.uid,
        { $inc: { no_of_delivery: 1 } }
      );

      delivery.is_delivery_counted = true;
      await delivery.save();
    }

    console.log("Delivery count updated successfully");

  } catch (err) {
    console.error("Cron error:", err);
  }
});
