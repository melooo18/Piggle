import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    "AIzaSyBqwqidqmlUWInZyddibyVMxsWMwL2XRto",
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    "aismartstudyassistant.firebaseapp.com",
  projectId:
    process.env.REACT_APP_FIREBASE_PROJECT_ID || "aismartstudyassistant",
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    "aismartstudyassistant.firebasestorage.app",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "139851756655",
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    "1:139851756655:web:d592c0ddc4e76a45f8099a",
  measurementId:
    process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-99S578MJ40",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
