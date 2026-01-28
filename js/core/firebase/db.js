import { getFirestore } from 'firebase/firestore';
import app from './app.js';

// Import Firestore helpers directly from the Firebase SDK
// This avoids CDN URLs and keeps all Firebase imports centralized
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';

// Initialize the Firestore database instance
// Bound to the already-initialized Firebase app
export const db = getFirestore(app);

// Re-export commonly used Firestore utilities
// This creates a single import surface for Firestore across the app
export { doc, setDoc, getDoc, collection, getDocs, onSnapshot, addDoc, serverTimestamp, deleteDoc };
