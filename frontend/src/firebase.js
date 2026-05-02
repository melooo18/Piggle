// ─────────────────────────────────────────────────────────
//  Firebase Configuration — frontend/src/firebase.js
// ─────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqwqidqmlUWInZyddibyVMxsWMwL2XRto",
  authDomain: "aismartstudyassistant.firebaseapp.com",
  projectId: "aismartstudyassistant",
  storageBucket: "aismartstudyassistant.firebasestorage.app",
  messagingSenderId: "139851756655",
  appId: "1:139851756655:web:d592c0ddc4e76a45f8099a",
  measurementId: "G-99S578MJ40",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
