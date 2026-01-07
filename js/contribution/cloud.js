import { auth, db } from "../firebase.js";
import { state } from "./state.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function saveToCloud() {
  if (!auth.currentUser) return;

  const taleTitle = document.getElementById("tale-title").value;

  const ref = doc(
    db,
    "artifacts",
    "taletranscend-pro",
    "users",
    auth.currentUser.uid,
    "drafts",
    "current"
  );

  await setDoc(
    ref,
    {
      title: taleTitle,
      chapters: state.chapters,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  const status = document.getElementById("stat-status");
  if (status) status.textContent = "Saved to Cloud";
}
