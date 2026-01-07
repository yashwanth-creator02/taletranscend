import { auth } from "../firebase.js";
import {
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export function initAuth(onReady) {
    (async () => {
        try {
            if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (err) {
            console.error("Auth failed:", err);
        }
    })();

    onAuthStateChanged(auth, (user) => {
        if (user) onReady(user);
    });
}
