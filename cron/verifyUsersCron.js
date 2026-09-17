import cron from "node-cron";
import User from "../models/User.js";

export const verifyUsersCron = () => {
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("🕛 Running user verification cron...");

      try {
        // ✅ Step 1: Check if any users exist to update
        const usersToVerify = await User.countDocuments({
          is_valid_adhar: 1,
          is_valid_pan: 1,
          is_verified_user: { $ne: 1 },
        });

        // ❌ If no users → EXIT
        if (usersToVerify === 0) {
          console.log("⚠️ No users found for verification. Exiting...");
          return; // 👉 yahi tum chahte ho
        }

        // ✅ Step 2: Update only if users exist
        const result = await User.updateMany(
          {
            is_valid_adhar: 1,
            is_valid_pan: 1,
            is_verified_user: { $ne: 1 },
          },
          {
            $set: { is_verified_user: 1 },
          }
        );

        console.log(`✅ Users verified: ${result.modifiedCount}`);
      } catch (error) {
        console.error("❌ Cron Error:", error.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );
};