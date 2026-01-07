import { db, auth, APP_ID } from "../firebase.js";
import { doc, onSnapshot, setDoc }
  from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { updateProfileUI } from "./ui.js";

let unsubscribe = null;

export function startProfileSync(uid) {
    const ref = doc(db, "artifacts", APP_ID, "users", uid);

    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
            updateProfileUI(snap.data());
        }
    });
}

export async function saveProfile() {
    if (!auth.currentUser) return;

    const name = document.getElementById("input-name")?.value || "";
    const bio  = document.getElementById("input-bio")?.value || "";

    const ref = doc(
        db,
        "artifacts",
        APP_ID,
        "users",
        auth.currentUser.uid
    );

    await setDoc(ref, { name, bio }, { merge: true });
}
