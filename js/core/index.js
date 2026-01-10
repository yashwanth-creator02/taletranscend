// js/core/index.js
export { auth, initAuth } from './auth.js';
export { db , doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp
} from './firebase/db.js';
export const appId = 'taletranscend-pro';
