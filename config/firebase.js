import admin from "firebase-admin";
import serviceAccount from "./firebase-service-account.json" with { type: "json" };
//firebase-service-account.json is a file that contains the service account credentials for your Firebase project. It is used to authenticate your server with Firebase services. Make sure to keep this file secure and do not expose it publicly.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;