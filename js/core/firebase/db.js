import { getFirestore } from 'firebase/firestore';
import app from './app.js';

// No more URLs! We import directly from the 'firebase' package
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

// Initialize Firestore
export const db = getFirestore(app);

// Re-exporting these
export { doc, setDoc, getDoc, collection, getDocs, onSnapshot, addDoc, serverTimestamp, deleteDoc };
