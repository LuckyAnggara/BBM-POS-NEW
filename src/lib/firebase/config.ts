
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// --- Temporary Debugging Log ---
// This log will help you verify if the API key is being loaded from your .env.local file.
// Check your browser's developer console when the app loads.
// REMOVE THIS LOG after you've confirmed your API key is loading correctly.
if (typeof window !== 'undefined') { // Only log on the client-side
  console.log(
    "Attempting to load Firebase API Key. Is it defined?",
    apiKey ? "Yes, a value is present." : "NO, IT IS UNDEFINED OR EMPTY. Check .env.local and restart your dev server."
  );
  // For more direct debugging, you could temporarily uncomment the line below to see the actual key.
  // WARNING: Be very careful with logging sensitive keys. Remove immediately after checking.
  // console.log("DEBUG: Actual Firebase API Key:", apiKey);
}
// --- End Temporary Debugging Log ---

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
