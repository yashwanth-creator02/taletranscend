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
  where,
  onSnapshot,
  refs,
} from '@fb/index.js';
import { createNotification } from '@state/index.js';
import { safeAsync, createLogger } from '@/utils';

const log = createLogger('NotificationService');
log.debug('Notification service initialized');

/**
 * Fetches notifications for a user, sorted newest first.
 *
 * @param {string} userId
 * @param {number} [maxCount=20]
 * @returns {Promise<Array<import('@state/schemas/notification.schema.js').Notification>>}
 */
export async function getUserNotifications(userId, maxCount = 20) {
  if (!userId) return [];

  return safeAsync(
    (async () => {
      const q = query(refs.notifications(userId), orderBy('createdAt', 'desc'), limit(maxCount));
      const snap = await getDocs(q);
      return snap.docs.map((doc) => createNotification(doc.id, doc.data()));
    })(),
    {
      fallback: [],
      logContext: 'services.notification.getUserNotifications',
    }
  );
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
    const q = query(refs.notifications(userId), where('isRead', '==', false), limit(50));
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
 * Marks all unread notifications as read.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) return false;

  return safeAsync(
    (async () => {
      const q = query(refs.notifications(userId), where('isRead', '==', false), limit(50));
      const snap = await getDocs(q);
      const updates = snap.docs.map((docSnap) =>
        updateDoc(refs.notification(userId, docSnap.id), { isRead: true })
      );
      await Promise.all(updates);
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
      const docRef = await addDoc(refs.notifications(userId), {
        ...notificationData,
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
