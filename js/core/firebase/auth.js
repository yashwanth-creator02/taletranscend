import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import app from "./app.js";

export const auth = getAuth(app);

/**
 * Universal Auth: Handles Custom Tokens, Anonymous sign-in, and Auth State.
 */
export function initAuth(onReady) {
  // 1. Listen for Auth State changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onReady(user);
    }
  });

  // 2. Immediate Login Check (IIFE)
  (async () => {
    if (auth.currentUser) return; // Already logged in

    try {
      // Check for custom token (often provided by server-side templates)
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (err) {
      console.error("Core Auth initialization failed:", err);
    }
  })();
}