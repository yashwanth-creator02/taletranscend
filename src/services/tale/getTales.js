// src/services/tale/getTales.js
// Fetches community tales from Firestore.
// Used by the library and home pages to populate tale listings.

import {
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  refs,
  getCountFromServer,
} from '@fb/index.js';
import { createTale } from '@state/index.js';

/**
 * Retrieves published tales from Firestore.
 * Defaults to status='published' so draft/pending content is never leaked.
 * All returned objects are normalized via createTale.
 *
 * @param {Object} [options]
 * @param {string}   [options.status='published']   - Tale status filter
 * @param {number}   [options.count=50]             - Max results to fetch
 * @param {any}      [options.after=null]            - Firestore cursor for pagination (lastVisible snap)
 * @returns {Promise<import('@state/schemas/tale.schema.js').Tale[]>}
 */
export async function getTales({ status = 'published', count = 50, after = null } = {}) {
  let q = query(
    refs.tales(),
    where('status', '==', status),
    orderBy('publishedAt', 'desc'),
    limit(count)
  );

  if (after) {
    q = query(
      refs.tales(),
      where('status', '==', status),
      orderBy('publishedAt', 'desc'),
      startAfter(after),
      limit(count)
    );
  }

  const snap = await getDocs(q);
  if (snap.empty) return [];

  return snap.docs.map((d) => createTale(d.id, d.data()));
}

/**
 * Fetches a paginated batch of published tales.
 * Returns both the normalized tales and the last document snapshot
 * so the caller can request the next page via startAfter.
 *
 * @param {Object} [options]
 * @param {number} [options.count=20] - Page size
 * @param {import('firebase/firestore').DocumentSnapshot|null} [options.after=null] - Cursor
 * @returns {Promise<{tales: import('@state/schemas/tale.schema.js').Tale[], lastDoc: import('firebase/firestore').DocumentSnapshot|null}>}
 */
export async function getTalesPage({ count = 20, after = null } = {}) {
  let q = query(
    refs.tales(),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(count)
  );

  if (after) {
    q = query(
      refs.tales(),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      startAfter(after),
      limit(count)
    );
  }

  const snap = await getDocs(q);
  if (snap.empty) return { tales: [], lastDoc: null };

  return {
    tales: snap.docs.map((d) => createTale(d.id, d.data())),
    lastDoc: snap.docs[snap.docs.length - 1],
  };
}

/**
 * Fetches a specific page of published tales with total count.
 * Uses page number instead of cursor for bidirectional navigation.
 *
 * @param {Object} options
 * @param {number} [options.page=1] - 1-based page number
 * @param {number} [options.perPage=8] - Items per page
 * @returns {Promise<{tales: Tale[], total: number, hasMore: boolean}>}
 */
export async function getTalesPageNumbered({ page = 1, perPage = 8 } = {}) {
  // Get total count first
  const countQuery = query(refs.tales(), where('status', '==', 'published'));
  const countSnap = await getCountFromServer(countQuery);
  const total = countSnap.data().count;

  // Build page query
  let q = query(
    refs.tales(),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(perPage)
  );

  // If not first page, use startAfter with cursor from previous page
  if (page > 1) {
    // Get cursor from previous page
    const prevQ = query(
      refs.tales(),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit((page - 1) * perPage)
    );
    const prevSnap = await getDocs(prevQ);
    const lastDoc = prevSnap.docs[prevSnap.docs.length - 1];

    if (lastDoc) {
      q = query(
        refs.tales(),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        startAfter(lastDoc),
        limit(perPage)
      );
    }
  }

  const snap = await getDocs(q);
  const tales = snap.docs.map((d) => createTale(d.id, d.data()));

  return {
    tales,
    total,
    hasMore: page * perPage < total,
  };
}

/**
 * Fetches all tales by a specific author regardless of status.
 * Used by the profile page to show a writer's full portfolio.
 *
 * @param {string} authorId
 * @returns {Promise<import('@state/schemas/tale.schema.js').Tale[]>}
 */
export async function getTalesByAuthor(authorId) {
  if (!authorId) return [];

  const q = query(refs.tales(), where('authorId', '==', authorId));
  const snap = await getDocs(q);

  if (snap.empty) return [];

  return snap.docs.map((d) => createTale(d.id, d.data()));
}
