import { db, auth, appId , doc, onSnapshot, setDoc } from "../core/index.js";
import { updateProfileUI } from "./ui.js";

let unsubscribe = null;

export function startProfileSync(uid) {
    const ref = doc(db, "artifacts", appId , "users", uid);

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
        appId,
        "users",
        auth.currentUser.uid
    );

    await setDoc(ref, { name, bio }, { merge: true });
}
