// src/state/schemas/notification.schema.js
// Canonical shape for notification documents.
// users/{uid}/notifications/{notificationId}

/**
 * @typedef {'new_comment'|'new_chapter'|'new_follower'|'tale_featured'|'reply'|'system'|'report_response'|'admin_message'|'moderation'} NotificationType
 *
 * @typedef {Object} Notification
 * @property {string}              id
 * @property {NotificationType}    type
 * @property {boolean}             isRead
 * @property {boolean}             isPinned
 * @property {string}              title
 * @property {string}              body
 * @property {string}              actionUrl
 * @property {string|null}         taleId
 * @property {string|null}         commentId
 * @property {string|null}         reportId
 * @property {string|null}         fromUserId
 * @property {string|null}         fromUserName
 * @property {string|null}         fromUserAvatarUrl
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 *
 * Legacy writers stored the target/body as `link` / `message`; the factory
 * accepts both shapes and always exposes `actionUrl` / `body` downstream.
 */

/**
 * @param {string} id
 * @param {Partial<Notification> & { message?: string, link?: string }} data
 * @returns {Notification}
 */
export function createNotification(id, data = {}) {
  return {
    id,
    type: data.type ?? 'new_comment',
    isRead: data.isRead ?? false,
    isPinned: data.isPinned ?? false,
    title: data.title ?? '',
    body: data.body ?? data.message ?? '',
    actionUrl: data.actionUrl ?? data.link ?? '',
    taleId: data.taleId ?? null,
    commentId: data.commentId ?? null,
    reportId: data.reportId ?? null,
    fromUserId: data.fromUserId ?? null,
    fromUserName: data.fromUserName ?? null,
    fromUserAvatarUrl: data.fromUserAvatarUrl ?? null,
    createdAt: data.createdAt ?? null,
  };
}
