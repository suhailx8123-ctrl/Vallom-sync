import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBiWXLvOzRQow72BjQtCqC1OWXf75CLFUM",
  authDomain: "sync-54575.firebaseapp.com",
  projectId: "sync-54575",
  storageBucket: "sync-54575.firebasestorage.app",
  messagingSenderId: "701132833405",
  appId: "1:701132833405:web:a75a9c3ddc49c393912714",
  measurementId: "G-B0ZXB2NF3S"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Analytics only runs safely on the client-side
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((yes) => yes && (analytics = getAnalytics(app)));
}

export { app, db, analytics };
