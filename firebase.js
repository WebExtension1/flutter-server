import admin from "firebase-admin";
import serviceAccount from "./firebase_private_key.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;