// js/reader/content.js

import { db } from "../firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = "taletranscend-pro";

export async function loadReaderContent({ taleId, chapterIdx }) {
  if (!taleId) return;

  // -------- Tale metadata --------
  const taleRef = doc(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "community_tales",
    taleId
  );

  const taleSnap = await getDoc(taleRef);

  if (taleSnap.exists()) {
    const t = taleSnap.data();
    setText("header-story-title", t.title);
    setText("sidebar-story-name", t.title);
    setText("sidebar-description", t.description);
    setText("author-name", t.authorName || "Unknown Scribe");
  }

  // -------- Chapters --------
  const chaptersRef = collection(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "community_tales",
    taleId,
    "chapters"
  );

  const snap = await getDocs(chaptersRef);
  const chapters = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0));

  const chapter = chapters[chapterIdx];
  if (!chapter) return { chapters };

  setText(
    "chapter-label",
    `Fragment ${String(chapterIdx + 1).padStart(2, "0")}`
  );

  setText("chapter-title", chapter.title);

  const story = document.getElementById("story-content");
  if (story) {
    story.innerHTML = chapter.content
      .split("\n")
      .filter(p => p.trim())
      .map(p => `<p class="mb-8">${p}</p>`)
      .join("");
  }

  return { chapters };
}

/* -------- Helpers -------- */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
