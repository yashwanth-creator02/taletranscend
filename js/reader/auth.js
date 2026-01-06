// js/reader/auth.js

import { auth } from "../firebase.js";

import {
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export function initAuth(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      onReady(user);
    } else {
      await signInAnonymously(auth);
    }
  });
}
