// src/services/notification.service.js
// Service for fetching and managing user notifications.
// users/{userId}/notifications/{notificationId}

import { getDocs, updateDoc, query, orderBy, limit, where, refs } from '@fb/index.js';
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
 * Fetches the count of unread notifications for a user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;

  return safeAsync(
    (async () => {
      const q = query(refs.notifications(userId), where('isRead', '==', false), limit(50));
      const snap = await getDocs(q);
      return snap.size;
    })(),
    {
      fallback: 0,
      logContext: 'services.notification.getUnreadNotificationCount',
    }
  );
}

/**
 * Marks a notification as read.
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
      });
      return true;
    })(),
    {
      fallback: false,
      logContext: 'services.notification.markNotificationAsRead',
    }
  );
}
