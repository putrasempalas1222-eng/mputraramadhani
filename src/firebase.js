import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDsm-pXC9h1XfJDwWUbmiMV5DoY4EIAOr4",
  authDomain: "database-moyomo.firebaseapp.com",
  databaseURL: "https://database-moyomo-default-rtdb.firebaseio.com",
  projectId: "database-moyomo",
  storageBucket: "database-moyomo.firebasestorage.app",
  messagingSenderId: "542342598184",
  appId: "1:542342598184:web:a4dc431d499469d9b8af1d",
  measurementId: "G-QP2N8TW82W",
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch { /* Analytics may be unavailable in local development. */ }

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);
