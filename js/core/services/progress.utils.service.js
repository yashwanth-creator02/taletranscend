// js/core/services/progress.utils.service.js

import { db, appId } from '../firebase/index.js';
import { collection, getDocs } from '../firebase/index.js';

export async function getTaleProgressData(userId, taleId) {
  try {
    const chaptersRef = collection(
      db,
      'artifacts',
      appId,
      'users',
      userId,
      'readerProgress',
      taleId,
      'chapters'
    );
    const snapshot = await getDocs(chaptersRef);

    const chaptersProgress = {};
    snapshot.forEach((doc) => {
      // doc.id is the chapter index (0, 1, 2...)
      // contains field 'scrollPercent'
      chaptersProgress[doc.id] = doc.data().scrollPercent || 0;
    });

    return chaptersProgress;
  } catch (err) {
    console.error('Failed to fetch chapter progress:', err);
    return {};
  }
}
