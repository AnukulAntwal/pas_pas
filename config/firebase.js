import admin from "firebase-admin";
import serviceAccount from "./firebase-service-account.json" with { type: "json" };

console.log("Firebase Project:", serviceAccount.project_id);
console.log("Firebase Client:", serviceAccount.client_email);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase initialized successfully");

export default admin;