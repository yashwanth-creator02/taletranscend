import { db, appId, doc, getDoc, collection, getDocs } from '@core/firebase/index.js';

export async function loadTale(taleId, user) {
  const publicRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_tales', taleId);
  const snap = await getDoc(publicRef);

  if (snap.exists()) return snap.data();

  const draftRef = doc(db, 'artifacts', appId, 'users', user.uid, 'drafts', taleId);
  const draftSnap = await getDoc(draftRef);
  return draftSnap.exists() ? draftSnap.data() : null;
}

export async function loadChapters(taleId) {
  const ref = collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'community_tales',
    taleId,
    'chapters'
  );
  const snap = await getDocs(ref);

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0));
}
