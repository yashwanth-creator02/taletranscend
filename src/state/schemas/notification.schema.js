// src/state/schemas/notification.schema.js
// Canonical shape for notification documents.
// users/{uid}/notifications/{notificationId}

/**
 * @typedef {'new_comment'|'new_chapter'|'new_follower'|'tale_featured'|'reply'} NotificationType
 *
 * @typedef {Object} Notification
 * @property {string}              id
 * @property {NotificationType}    type
 * @property {boolean}             isRead
 * @property {string}              title
 * @property {string}              body
 * @property {string}              actionUrl
 * @property {string|null}         taleId
 * @property {string|null}         commentId
 * @property {string|null}         fromUserId
 * @property {string|null}         fromUserName
 * @property {string|null}         fromUserAvatarUrl
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 */

/**
 * @param {string} id
 * @param {Partial<Notification>} data
 * @returns {Notification}
 */
export function createNotification(id, data = {}) {
  return {
    id,
    type:               data.type               ?? 'new_comment',
    isRead:             data.isRead             ?? false,
    title:              data.title              ?? '',
    body:               data.body               ?? '',
    actionUrl:          data.actionUrl          ?? '',
    taleId:             data.taleId             ?? null,
    commentId:          data.commentId          ?? null,
    fromUserId:         data.fromUserId         ?? null,
    fromUserName:       data.fromUserName       ?? null,
    fromUserAvatarUrl:  data.fromUserAvatarUrl  ?? null,
    createdAt:          data.createdAt          ?? null,
  };
}
