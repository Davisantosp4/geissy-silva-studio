import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANgJjpsjmPIw55b5d8hTTBkgMcim8CzMU",
  authDomain: "geissy-silva-studio.firebaseapp.com",
  projectId: "geissy-silva-studio",
  storageBucket: "geissy-silva-studio.firebasestorage.app",
  messagingSenderId: "1065306108275",
  appId: "1:1065306108275:web:379a3b5a19a4979f699506",
  measurementId: "G-ZZZTGYJKE9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);