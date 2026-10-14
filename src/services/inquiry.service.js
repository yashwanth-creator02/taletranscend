// src/services/inquiry.service.js
// Service for Chronicle Missives (two-way correspondence between readers and authors).
// Handles Firestore queries, real-time listeners, submission, replies, and status updates.

import {
  refs,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from '@fb/index.js';
import { createLogger, safeAsync } from '@/utils';

const log = createLogger('InquiryService');

/**
 * Extracts a numeric epoch timestamp (ms) from diverse timestamp representations.
 * Handles Firestore Timestamp objects, raw protobuf seconds, Dates, and ISO strings.
 *
 * @param {Object} item
 * @returns {number}
 */
export function getTimestampMs(item) {
  if (!item) return 0;
  const ts = item.createdAt || item.timestamp;
  if (!ts) return 0;
  if (typeof ts === 'object' && typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  if (typeof ts === 'object' && typeof ts.seconds === 'number') {
    return ts.seconds * 1000 + (ts.nanoseconds ? Math.floor(ts.nanoseconds / 1000000) : 0);
  }
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Merges local cached inquiries with remote Firestore inquiries.
 * Ensures remote data takes precedence for matching document IDs,
 * while retaining local-only optimistic items.
 *
 * @param {Array<Object>} localInquiries
 * @param {Array<Object>} remoteInquiries
 * @returns {Array<Object>} Sorted inquiries descending by date
 */
export function mergeInquiries(localInquiries = [], remoteInquiries = []) {
  const map = new Map();

  // Seed with local inquiries
  for (const item of localInquiries) {
    if (item && item.id != null) {
      map.set(String(item.id), item);
    }
  }

  // Deduplicate and merge remote inquiries
  for (const item of remoteInquiries) {
    if (!item || item.id == null) continue;
    const key = String(item.id);

    // If there's an optimistic local item with numeric ID that matches sender & message, replace it
    if (!map.has(key)) {
      for (const [localId, localItem] of map.entries()) {
        if (
          typeof localItem.id === 'number' &&
          localItem.senderId === item.senderId &&
          localItem.message === item.message
        ) {
          map.delete(localId);
          break;
        }
      }
    }

    const existing = map.get(key) || {};
    map.set(key, { ...existing, ...item });
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
  return merged;
}

/**
 * Fetches all missives directed to an author for a specific chronicle.
 *
 * @param {string} taleId
 * @param {string} authorId
 * @returns {Promise<Array<Object>>}
 */
export async function fetchAuthorInquiries(taleId, authorId) {
  if (!taleId || !authorId || authorId === 'anonymous') {
    return [];
  }

  log.debug('Fetching author inquiries from Firestore', { taleId, authorId });
  try {
    const q = query(
      refs.inquiries(),
      where('authorId', '==', authorId),
      where('taleId', '==', taleId)
    );

    const snap = await safeAsync(getDocs(q), {
      fallback: { docs: [] },
      logContext: `inquiryService.fetchAuthorInquiries.${taleId}`,
    });

    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    results.sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
    log.info('Author inquiries loaded successfully', { count: results.length });
    return results;
  } catch (err) {
    log.error('Failed to fetch author inquiries', err);
    return [];
  }
}

/**
 * Subscribes to real-time updates for missives directed to an author for a specific chronicle.
 *
 * @param {string} taleId
 * @param {string} authorId
 * @param {(inquiries: Array<Object>) => void} onUpdate
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} Unsubscribe function
 */
export function subscribeAuthorInquiries(taleId, authorId, onUpdate, onError) {
  if (!taleId || !authorId || authorId === 'anonymous') {
    return () => {};
  }

  log.info('Subscribing to author inquiries stream', { taleId, authorId });
  try {
    const q = query(
      refs.inquiries(),
      where('authorId', '==', authorId),
      where('taleId', '==', taleId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        results.sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
        if (onUpdate) onUpdate(results);
      },
      (err) => {
        log.warn('Real-time author inquiries listener error', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    log.error('Failed to attach author inquiries listener', err);
    return () => {};
  }
}

/**
 * Fetches all missives dispatched by a specific reader for a chronicle.
 *
 * @param {string} taleId
 * @param {string} senderId
 * @returns {Promise<Array<Object>>}
 */
export async function fetchReaderInquiries(taleId, senderId) {
  if (!taleId || !senderId || senderId === 'anonymous') {
    return [];
  }

  log.debug('Fetching reader inquiries from Firestore', { taleId, senderId });
  try {
    const q = query(
      refs.inquiries(),
      where('senderId', '==', senderId),
      where('taleId', '==', taleId)
    );

    const snap = await safeAsync(getDocs(q), {
      fallback: { docs: [] },
      logContext: `inquiryService.fetchReaderInquiries.${taleId}`,
    });

    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    results.sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
    return results;
  } catch (err) {
    log.error('Failed to fetch reader inquiries', err);
    return [];
  }
}

/**
 * Subscribes to real-time updates for missives dispatched by a reader.
 *
 * @param {string} taleId
 * @param {string} senderId
 * @param {(inquiries: Array<Object>) => void} onUpdate
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} Unsubscribe function
 */
export function subscribeReaderInquiries(taleId, senderId, onUpdate, onError) {
  if (!taleId || !senderId || senderId === 'anonymous') {
    return () => {};
  }

  log.info('Subscribing to reader inquiries stream', { taleId, senderId });
  try {
    const q = query(
      refs.inquiries(),
      where('senderId', '==', senderId),
      where('taleId', '==', taleId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        results.sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
        if (onUpdate) onUpdate(results);
      },
      (err) => {
        log.warn('Real-time reader inquiries listener error', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    log.error('Failed to attach reader inquiries listener', err);
    return () => {};
  }
}

/**
 * Dispatches a new missive to the author and persists it to Firestore.
 *
 * @param {Object} params
 * @param {string} params.taleId
 * @param {string} params.authorId
 * @param {string} params.senderId
 * @param {string} params.senderMoniker
 * @param {string} [params.senderContact]
 * @param {string} [params.category]
 * @param {string} params.message
 * @returns {Promise<Object>} Created inquiry document data with ID
 */
export async function createInquiry({
  taleId,
  authorId,
  senderId,
  senderMoniker,
  senderContact = '',
  category = 'lore',
  message,
}) {
  if (!taleId || !authorId || !senderId || !message) {
    throw new Error('Missing mandatory fields to create inquiry');
  }

  const payload = {
    taleId,
    authorId,
    senderId,
    senderMoniker: senderMoniker || 'Reader',
    senderContact: senderContact || '',
    category,
    message,
    status: 'sent',
    createdAt: serverTimestamp ? serverTimestamp() : new Date(),
  };

  log.info('Persisting new missive to Firestore', { taleId, authorId, senderId });
  const docRef = await addDoc(refs.inquiries(), payload);

  return {
    id: docRef.id,
    ...payload,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Updates an inquiry with the author's inscribed reply.
 *
 * @param {string} inquiryId
 * @param {Object} replyParams
 * @param {string} replyParams.replyText
 * @param {string} [replyParams.authorName]
 * @returns {Promise<void>}
 */
export async function replyToInquiry(inquiryId, { replyText, authorName = 'The Scribe' }) {
  if (!inquiryId || !replyText) {
    throw new Error('Inquiry ID and reply text are required');
  }

  log.info('Author transmitting response to inquiry', { inquiryId });
  const inquiryRef = refs.inquiry(inquiryId);
  await updateDoc(inquiryRef, {
    status: 'replied',
    replyText: replyText.trim(),
    replyAuthorName: authorName,
    repliedAt: serverTimestamp ? serverTimestamp() : new Date(),
  });
}

/**
 * Flags an inquiry as reported for archivist moderation.
 *
 * @param {string} inquiryId
 * @returns {Promise<void>}
 */
export async function reportInquiry(inquiryId) {
  if (!inquiryId) return;
  log.info('Reporting inquiry to archivists', { inquiryId });
  const inquiryRef = refs.inquiry(inquiryId);
  await updateDoc(inquiryRef, {
    status: 'reported',
    isReported: true,
  });
}

/**
 * Blocks the sender of an inquiry from further missives.
 *
 * @param {string} inquiryId
 * @returns {Promise<void>}
 */
export async function blockInquirySender(inquiryId) {
  if (!inquiryId) return;
  log.info('Blocking sender for inquiry', { inquiryId });
  const inquiryRef = refs.inquiry(inquiryId);
  await updateDoc(inquiryRef, {
    status: 'blocked',
    isBlocked: true,
  });
}
