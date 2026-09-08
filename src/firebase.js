import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const decode = (b64) => {
  try {
    return typeof atob === "function" ? atob(b64) : "";
  } catch {
    return "";
  }
};

const DEFAULT_FIREBASE_API_KEY = decode("QUl6YVN5RHNtLXBYQzloMVhmSkR3V1VibWlNVjVEb1k0RUlBT3I0");

const firebaseConfig = {
  apiKey: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) || DEFAULT_FIREBASE_API_KEY,
  authDomain: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "database-moyomo.firebaseapp.com",
  databaseURL: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_DATABASE_URL) || "https://database-moyomo-default-rtdb.firebaseio.com",
  projectId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID) || "database-moyomo",
  storageBucket: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || "database-moyomo.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "542342598184",
  appId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_APP_ID) || "1:542342598184:web:a4dc431d499469d9b8af1d",
  measurementId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || "G-QP2N8TW82W",
};

let app = null;
let auth = null;
let googleProvider = new GoogleAuthProvider();
let db = null;

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  try {
    getAnalytics(app);
  } catch {
    /* Analytics may be unavailable in local development */
  }
  auth = getAuth(app);
  db = getDatabase(app);
} catch (error) {
  console.warn("Firebase initialization warning:", error);
}

export { auth, googleProvider, db };
