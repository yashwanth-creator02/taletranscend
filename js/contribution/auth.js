import { auth } from "../firebase.js";
import {
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export function initContributionAuth() {
    signInAnonymously(auth).catch(console.error);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Contribution UID:", user.uid);
        }
    });
}
