import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
 
const firebaseConfig = {
  apiKey: "AIzaSyAEXsfCapgiDdKIF9tV1DlvTSnbt6tQ9CI",
  authDomain: "charin-cook.firebaseapp.com",
  projectId: "charin-cook",
  storageBucket: "charin-cook.firebasestorage.app",
  messagingSenderId: "284962739244",
  appId: "1:284962739244:web:ff0a8aee4d117a3a22ed89",
  measurementId: "G-J51VBZLXMZ"
};
 
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);