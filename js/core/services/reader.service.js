// js/core/services/reader.service.js

import { db } from "../firebase/db.js";
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = "taletranscend-pro";

export async function getReaderChapter(taleId, chapterIndex) {
  if (!taleId) return null;

  // ---- Tale metadata ----
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
  if (!taleSnap.exists()) return null;

  const tale = taleSnap.data();

  // ---- Chapters ----
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

  const total = chapters.length;
  const chapter = chapters[chapterIndex];

  if (!chapter) return null;

  return {
    tale: {
      title: tale.title,
      description: tale.description,
      authorName: tale.authorName || "Unknown Scribe"
    },
    chapter,
    navigation: {
      index: chapterIndex,
      total,
      hasPrev: chapterIndex > 0,
      hasNext: chapterIndex < total - 1,
      prevIndex: chapterIndex - 1,
      nextIndex: chapterIndex + 1
    }
  };
}
