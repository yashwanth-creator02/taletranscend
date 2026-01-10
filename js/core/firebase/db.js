// js/core/firebase/db.js
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import app from "./app.js";

// Initialize Firestore
export const db = getFirestore(app);

export {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";