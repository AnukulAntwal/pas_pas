import admin from "../config/firebase.js";

export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  try {
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
    };

    const response = await admin.messaging().send(message);

    console.log("FCM Success:", response);

    return response;
  } catch (error) {
    console.error("FCM Error:", error);
    throw error;
  }
};