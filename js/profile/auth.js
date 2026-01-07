import { auth } from "../firebase.js";
import { signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { startProfileSync } from "./sync.js";

export function initProfileAuth() {
    signInAnonymously(auth).catch(console.error);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Profile UID:", user.uid);
            startProfileSync(user.uid);
        }
    });
}
