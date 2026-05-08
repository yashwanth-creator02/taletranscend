// src/firebase/db.js
// Firestore database instance and re-exported SDK utilities.
// Import Firestore functions from here instead of directly from 'firebase/firestore'
// to keep all Firebase access centralized and path-change-proof.

import { getFirestore } from 'firebase/firestore';
import app from './app.js';

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
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

// Single shared Firestore instance bound to the initialized Firebase app.
export const db = getFirestore(app);

// Re-export all Firestore utilities through a single import surface.
// Pages and services should import Firestore helpers from here, not the SDK directly.
export {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  writeBatch,
};
