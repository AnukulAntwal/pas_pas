import cron from "node-cron";
import Package from "../models/Package.js";

cron.schedule("*/20 * * * *", async () => {
  try {
    const now = new Date();

    // 1 hour before current time
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find packages that should be completed
    const result = await Package.updateMany(
      {
        is_completed: 0,
        date_time: { $lte: oneHourAgo }
      },
      {
        $set: { is_completed: 1 }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`📦 ${result.modifiedCount} packages marked completed`);
    }

  } catch (err) {
    console.error("❌ Package Cron error:", err);
  }
});