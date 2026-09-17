import admin from "../config/firebase.js";

export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  try {
    // ✅ Debug logs
    console.log("========== FCM REQUEST ==========");
    console.log("Token:", token);
    console.log("Title:", title);
    console.log("Body:", body);
    console.log("Data:", data);

    if (!token) {
      throw new Error("FCM token is missing or empty.");
    }

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    console.log("FCM Payload:", JSON.stringify(message, null, 2));

    const response = await admin.messaging().send(message);

    console.log("========== FCM SUCCESS ==========");
    console.log("Message ID:", response);

    return response;

  } catch (error) {
    console.error("========== FCM ERROR ==========");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Full Error:", error);

    throw error;
  }
};