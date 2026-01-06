import { auth } from "../firebase.js";
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } 
from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export function initAuth(onReady) {
    (async () => {
        try {
            if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (e) {
            console.error("Auth failed", e);
        }
    })();

    onAuthStateChanged(auth, (user) => {
        if (user) onReady(user);
    });
}
