import { db, auth, APP_ID } from "../firebase.js";
import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function submitTale() {
    if (!auth.currentUser) return;

    const titleEl = document.getElementById("story-title-input");
    const contentEl = document.getElementById("story-content-input");
    const authorEl = document.getElementById("desktop-display-name");

    const title = titleEl?.value?.trim();
    const content = contentEl?.value?.trim();

    if (!title || !content) return;

    const ref = collection(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "shared_tales"
    );

    await addDoc(ref, {
        title,
        content,
        authorId: auth.currentUser.uid,
        authorName: authorEl?.innerText || "Anonymous Scribe",
        createdAt: serverTimestamp(),
        likes: 0
    });

    /* reset UI */
    titleEl.value = "";
    contentEl.value = "";
    document.getElementById("story-editor")?.classList.add("hidden");
    document.body.style.overflow = "auto";
}
