// src/services/notification.service.js
// Service for fetching and managing user notifications.
// users/{userId}/notifications/{notificationId}

import {
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  onSnapshot,
  refs,
} from '@fb/index.js';
import { createNotification } from '@state/index.js';
import { safeAsync, createLogger } from '@/utils';

const log = createLogger('NotificationService');
log.debug('Notification service initialized');

/** Upper bound for the count subscriptions and pinned window. */
const NOTIFICATION_QUERY_LIMIT = 50;

/** Default page size for the settings inbox. */
export const INBOX_PAGE_SIZE = 20;

/**
 * Builds the single-field pinned query (no composite index required).
 *
 * @param {string} userId
 * @param {number} maxCount
 */
function pinnedNotificationsQuery(userId, maxCount) {
  return query(refs.notifications(userId), where('isPinned', '==', true), limit(maxCount));
}

/**
 * Sorts notifications newest-first using their createdAt timestamp.
 *
 * @param {Array<import('@state/schemas/notification.schema.js').Notification>} items
 * @returns {Array<import('@state/schemas/notification.schema.js').Notification>}
 */
function sortByNewestFirst(items) {
  return [...items].sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  });
}

/**
 * Fetches notifications for a user, pinned notices first, then newest first.
 *
 * Pinned notices are queried separately so an old pinned notice stays visible
 * even once it has scrolled past the recent window.
 *
 * @param {string} userId
 * @param {number} [maxCount=20]
 * @returns {Promise<Array<import('@state/schemas/notification.schema.js').Notification>>}
 */
export async function getUserNotifications(userId, maxCount = 20) {
  if (!userId) return [];

  return safeAsync(
    (async () => {
      const recentQuery = query(
        refs.notifications(userId),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
      const pinnedQuery = pinnedNotificationsQuery(userId, maxCount);
      const [recentSnap, pinnedSnap] = await Promise.all([
        getDocs(recentQuery),
        getDocs(pinnedQuery),
      ]);

      const pinned = sortByNewestFirst(
        pinnedSnap.docs.map((doc) => createNotification(doc.id, doc.data()))
      );
      const recent = sortByNewestFirst(
        recentSnap.docs.map((doc) => createNotification(doc.id, doc.data()))
      );

      const pinnedIds = new Set(pinned.map((item) => item.id));
      return [...pinned, ...recent.filter((item) => !pinnedIds.has(item.id))];
    })(),
    {
      fallback: [],
      logContext: 'services.notification.getUserNotifications',
    }
  );
}

/**
 * Fetches one chronological page of a user's inbox for the Settings view.
 *
 * Unlike {@link getUserNotifications}, this keeps pinned notices in their
 * natural place so the inbox reads as a complete message history. The cursor
 * is the last Firestore document from the previous page.
 *
 * @param {string} userId
 * @param {{ pageSize?: number, cursor?: import('firebase/firestore').QueryDocumentSnapshot | null }} [options]
 * @returns {Promise<{ items: Array<import('@state/schemas/notification.schema.js').Notification>, nextCursor: import('firebase/firestore').QueryDocumentSnapshot | null, hasMore: boolean }>}
 */
export async function getUserNotificationsPage(
  userId,
  { pageSize = INBOX_PAGE_SIZE, cursor = null } = {}
) {
  if (!userId) return { items: [], nextCursor: null, hasMore: false };

  const size = Math.min(Math.max(Number(pageSize) || INBOX_PAGE_SIZE, 1), 50);
  const constraints = [orderBy('createdAt', 'desc'), limit(size + 1)];
  if (cursor) constraints.push(startAfter(cursor));

  const snap = await getDocs(query(refs.notifications(userId), ...constraints));
  const pageDocs = snap.docs.slice(0, size);
  const items = sortByNewestFirst(pageDocs.map((doc) => createNotification(doc.id, doc.data())));

  return {
    items,
    nextCursor: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
    hasMore: snap.docs.length > size,
  };
}

/**
 * Subscribes to real-time changes in the unread notifications count.
 *
 * @param {string} userId
 * @param {(count: number) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribeUnreadNotifications(userId, onUpdate) {
  if (!userId || typeof onUpdate !== 'function') return () => {};

  try {
    const q = query(
      refs.notifications(userId),
      where('isRead', '==', false),
      limit(NOTIFICATION_QUERY_LIMIT)
    );
    return onSnapshot(
      q,
      (snap) => {
        onUpdate(snap ? snap.size : 0);
      },
      (error) => {
        log.error('Error in unread notifications snapshot listener:', error);
      }
    );
  } catch (err) {
    log.error('Failed to attach unread notifications listener:', err);
    return () => {};
  }
}

/**
 * Subscribes to real-time changes in the pinned notifications count.
 *
 * @param {string} userId
 * @param {(count: number) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribePinnedNotificationCount(userId, onUpdate) {
  if (!userId || typeof onUpdate !== 'function') return () => {};

  try {
    const q = pinnedNotificationsQuery(userId, NOTIFICATION_QUERY_LIMIT);
    return onSnapshot(
      q,
      (snap) => {
        onUpdate(snap ? snap.size : 0);
      },
      (error) => {
        log.error('Error in pinned notifications snapshot listener:', error);
      }
    );
  } catch (err) {
    log.error('Failed to attach pinned notifications listener:', err);
    return () => {};
  }
}

/**
 * Marks one notification as read for the user.
 *
 * @param {string} userId
 * @param {string} notificationId
 * @returns {Promise<boolean>}
 */
export async function markNotificationAsRead(userId, notificationId) {
  if (!userId || !notificationId) return false;

  return safeAsync(
    (async () => {
      await updateDoc(refs.notification(userId, notificationId), {
        isRead: true,
        readAt: serverTimestamp(),
      });
      return true;
    })(),
    {
      fallback: false,
      logContext: 'services.notification.markNotificationAsRead',
    }
  );
}

/**
 * Pins or unpins a single notification for the user.
 *
 * @param {string} userId
 * @param {string} notificationId
 * @param {boolean} isPinned
 * @returns {Promise<boolean>}
 */
export async function setNotificationPinned(userId, notificationId, isPinned) {
  if (!userId || !notificationId) return false;

  return safeAsync(
    (async () => {
      await updateDoc(refs.notification(userId, notificationId), {
        isPinned: Boolean(isPinned),
      });
      return true;
    })(),
    {
      fallback: false,
      logContext: 'services.notification.setNotificationPinned',
    }
  );
}

/**
 * Marks all unread notifications as read.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) return false;

  return safeAsync(
    (async () => {
      // Keep paging until no unread notice remains. A single 50-document window
      // would leave older notices unread in a busy inbox.
      for (let pass = 0; pass < 20; pass += 1) {
        const q = query(
          refs.notifications(userId),
          where('isRead', '==', false),
          limit(NOTIFICATION_QUERY_LIMIT)
        );
        const snap = await getDocs(q);
        if (!snap.docs.length) break;

        // firestore.rules allows an owner to change only isRead + readAt; write
        // both so the rule's allowlist and the stored data stay aligned.
        const updates = snap.docs.map((docSnap) =>
          updateDoc(refs.notification(userId, docSnap.id), {
            isRead: true,
            readAt: serverTimestamp(),
          })
        );
        await Promise.all(updates);

        if (snap.docs.length < NOTIFICATION_QUERY_LIMIT) break;
      }
      return true;
    })(),
    {
      fallback: false,
      logContext: 'services.notification.markAllNotificationsAsRead',
    }
  );
}

/**
 * Creates and delivers a notification to a specific user.
 *
 * @param {string} userId
 * @param {object} notificationData
 * @returns {Promise<string|null>} Created notification doc ID or null
 */
export async function createNotificationForUser(userId, notificationData) {
  if (!userId || !notificationData) return null;

  return safeAsync(
    (async () => {
      // Normalize the legacy `message` / `link` spellings to the canonical
      // `body` / `actionUrl` field names at write time, so newly stored
      // documents never need the read-side fallback in createNotification.
      const { message, link, ...rest } = notificationData;
      const docRef = await addDoc(refs.notifications(userId), {
        ...rest,
        body: notificationData.body ?? message ?? '',
        actionUrl: notificationData.actionUrl ?? link ?? '',
        isRead: false,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    })(),
    {
      fallback: null,
      logContext: 'services.notification.createNotificationForUser',
    }
  );
}
