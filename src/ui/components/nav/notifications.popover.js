// src/ui/components/nav/notifications.popover.js
// Handles the floating notification trigger, its drawer, real-time counts,
// and pin/unpin toggling.

import {
  getUserNotifications,
  setNotificationPinned,
  subscribePinnedNotificationCount,
  subscribeUnreadNotifications,
} from '@services/notification.service.js';
import { renderIcons } from './nav.utils.js';
import { createLogger, resolveHref, timeAgo, escapeHtml } from '@/utils';

const log = createLogger('NotificationsPopover');

const MAX_BADGE_COUNT = 9;

let _unsubscribeUnread = null;
let _unsubscribePinned = null;
let _currentUserId = null;
let _unreadCount = 0;
let _pinnedCount = 0;

/**
 * Returns the floating notifications root element.
 *
 * @returns {HTMLElement | null}
 */
function getNotificationsRoot() {
  return document.getElementById('nav-notifications-container');
}

/**
 * Keeps the trigger's accessible name in sync with unread/pinned state.
 */
function syncNotificationsTriggerLabel() {
  const btn = document.getElementById('nav-notifications-btn');
  if (!btn) return;

  const parts = [];
  if (_unreadCount > 0) parts.push(`${_unreadCount} unread`);
  if (_pinnedCount > 0) parts.push(`${_pinnedCount} pinned`);

  btn.setAttribute(
    'aria-label',
    parts.length ? `Chronicle Notices — ${parts.join(', ')}` : 'Chronicle Notices'
  );
}

/**
 * Shows the floating trigger while unread OR pinned notices exist,
 * and removes it once the user has neither.
 */
function applyNotificationsVisibility() {
  const root = getNotificationsRoot();
  if (!root) return;

  if (_unreadCount > 0 || _pinnedCount > 0) {
    root.classList.remove('is-hidden');
    return;
  }

  // Nothing left to surface — close the drawer before the trigger goes away.
  closeNotificationsPopover();

  const active = document.activeElement;
  if (active instanceof HTMLElement && root.contains(active)) {
    document.getElementById('nav-settings-btn')?.focus();
  }

  root.classList.remove('nav-notifications-float--pinned');
  root.classList.add('is-hidden');
}

/**
 * Updates the unread badge and the trigger visibility.
 *
 * @param {number} count
 */
export function updateNotificationBadge(count) {
  _unreadCount = count > 0 ? count : 0;

  const badge = document.getElementById('nav-notifications-badge');
  if (badge) {
    if (_unreadCount > 0) {
      badge.textContent =
        _unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(_unreadCount);
      badge.classList.remove('hidden');
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
    }
  }

  syncNotificationsTriggerLabel();
  applyNotificationsVisibility();
}

/**
 * Updates the pinned count, the trigger state, and the trigger visibility.
 *
 * @param {number} count
 */
export function updatePinnedCount(count) {
  _pinnedCount = count > 0 ? count : 0;

  const root = getNotificationsRoot();
  if (root) root.classList.toggle('nav-notifications-float--pinned', _pinnedCount > 0);

  syncNotificationsTriggerLabel();
  applyNotificationsVisibility();
}

/**
 * Normalizes a Firestore Timestamp, Date, or millis value into a Date.
 *
 * @param {unknown} value
 * @returns {Date | null}
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.toMillis === 'function') return new Date(value.toMillis());
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

/**
 * Resolves a notice target into a safe in-app href. Schemes and
 * protocol-relative URLs are rejected so a stored value can never become an
 * execution vector; relative targets are resolved against the app base.
 *
 * @param {unknown} value
 * @returns {string} Empty string when the notice has no usable target.
 */
function toSafeNotificationHref(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url || url === '#' || url.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return '';
  }
  return resolveHref(url);
}

/**
 * Finds the pin control for a notice, if the row is currently rendered.
 *
 * @param {string} notificationId
 * @returns {HTMLElement | undefined}
 */
function findPinButton(notificationId) {
  return Array.from(document.querySelectorAll('.nav-notifications-item__pin')).find(
    (el) => el.dataset.notificationId === notificationId
  );
}

/**
 * Renders a single notification row with its pin control.
 *
 * @param {import('@state/schemas/notification.schema.js').Notification} item
 * @returns {string}
 */
function buildNotificationItem(item) {
  const isUnread = !item.isRead;
  const isPinned = Boolean(item.isPinned);
  const created = toDate(item.createdAt);
  const formattedTime = created ? timeAgo(created) : 'Recently';
  const safeTitle = escapeHtml(item.title || 'Archival Update');
  const safeBody = escapeHtml(item.body || '');
  const href = toSafeNotificationHref(item.actionUrl ?? item.link);
  const id = escapeHtml(item.id);
  const pinLabel = isPinned ? 'Unpin notice' : 'Pin notice';

  const content = `
      <div class="nav-notifications-item__header">
        <h4 class="nav-notifications-item__title">${safeTitle}</h4>
        <span class="nav-notifications-item__time">${formattedTime}</span>
      </div>
      ${safeBody ? `<p class="nav-notifications-item__body">${safeBody}</p>` : ''}
  `;

  return `
    <div class="nav-notifications-item${isUnread ? ' nav-notifications-item--unread' : ''}${
      isPinned ? ' nav-notifications-item--pinned' : ''
    }">
      ${
        href
          ? `<a href="${escapeHtml(href)}" class="nav-notifications-item__link">${content}</a>`
          : `<div class="nav-notifications-item__link">${content}</div>`
      }
      <button
        type="button"
        class="nav-notifications-item__pin"
        data-notification-id="${id}"
        aria-pressed="${isPinned}"
        aria-label="${pinLabel}"
        title="${pinLabel}"
      >
        <i data-lucide="pin" aria-hidden="true"></i>
      </button>
    </div>
  `;
}

/**
 * Fetches and renders the notification list.
 *
 * @param {string} userId
 * @param {{ showLoading?: boolean }} [options]
 */
async function renderNotificationList(userId, { showLoading = true } = {}) {
  const listEl = document.getElementById('nav-notifications-list');
  if (!listEl) return;

  if (showLoading) {
    listEl.innerHTML = `
      <div class="nav-notifications-loading">
        <div class="nav-notifications-spinner"></div>
        <p class="nav-notifications-loading__text">Reading sacred chronicles...</p>
      </div>
    `;
  }

  try {
    const notifications = await getUserNotifications(userId, 20);

    if (!notifications || notifications.length === 0) {
      listEl.innerHTML = '<div class="nav-notifications-empty">No notices in the archive</div>';
      return;
    }

    listEl.innerHTML = notifications.map(buildNotificationItem).join('');
    renderIcons();
  } catch (error) {
    // A render fault must never leave the drawer stuck on the loading state.
    log.error('Failed to render notifications:', error);
    listEl.innerHTML = '<div class="nav-notifications-empty">The archive could not be read</div>';
  }
}

/**
 * Loads and renders the latest notifications into the popover list.
 *
 * @param {string} userId
 */
export async function loadAndRenderNotifications(userId) {
  await renderNotificationList(userId, { showLoading: true });
}

/**
 * Pins or unpins a notification, then refreshes the list ordering.
 *
 * @param {string} notificationId
 */
export async function toggleNotificationPin(notificationId) {
  if (!_currentUserId || !notificationId) return;

  const btn = findPinButton(notificationId);
  const isPinned = btn?.getAttribute('aria-pressed') === 'true';

  const updated = await setNotificationPinned(_currentUserId, notificationId, !isPinned);
  if (!updated) return;

  // Re-rendering replaces the row, so keep keyboard focus on the same control.
  await renderNotificationList(_currentUserId, { showLoading: false });
  findPinButton(notificationId)?.focus();
}

/**
 * Toggles the notifications popover visibility.
 */
export function toggleNotificationsPopover() {
  const popover = document.getElementById('nav-notifications-popover');
  const btn = document.getElementById('nav-notifications-btn');
  if (!popover || !btn) return;

  const isHidden = popover.classList.contains('hidden');
  if (isHidden) {
    popover.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    // Enter the dialog so keyboard users land inside it rather than behind it.
    popover.querySelector('button, [href], [tabindex]:not([tabindex="-1"])')?.focus();
    if (_currentUserId) {
      loadAndRenderNotifications(_currentUserId);
    }
  } else {
    popover.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Initializes the notifications popover and its real-time subscribers.
 *
 * @param {import('firebase/auth').User | null} user
 */
export function initNotifications(user) {
  if (_unsubscribeUnread) {
    _unsubscribeUnread();
    _unsubscribeUnread = null;
  }
  if (_unsubscribePinned) {
    _unsubscribePinned();
    _unsubscribePinned = null;
  }

  const nextUserId = user?.uid || null;
  const accountChanged = nextUserId !== _currentUserId;
  _currentUserId = nextUserId;

  closeNotificationsPopover();

  if (!_currentUserId) {
    updateNotificationBadge(0);
    updatePinnedCount(0);
    return;
  }

  // Token refreshes re-init with the same uid — keep the counts then, but never
  // carry a previous account's counts into a new one.
  if (accountChanged) {
    updateNotificationBadge(0);
    updatePinnedCount(0);
  }

  _unsubscribeUnread = subscribeUnreadNotifications(_currentUserId, updateNotificationBadge);
  _unsubscribePinned = subscribePinnedNotificationCount(_currentUserId, updatePinnedCount);
}

/**
 * Closes the notifications popover if open.
 *
 * @param {boolean} [returnFocus=false] Move focus back to the trigger.
 */
export function closeNotificationsPopover(returnFocus = false) {
  const popover = document.getElementById('nav-notifications-popover');
  if (!popover) return;

  const wasOpen = !popover.classList.contains('hidden');
  popover.classList.add('hidden');

  const btn = document.getElementById('nav-notifications-btn');
  btn?.setAttribute('aria-expanded', 'false');

  if (returnFocus && wasOpen) btn?.focus();
}

/**
 * Cleans up notifications listeners and state.
 */
export function destroyNotifications() {
  if (_unsubscribeUnread) {
    _unsubscribeUnread();
    _unsubscribeUnread = null;
  }
  if (_unsubscribePinned) {
    _unsubscribePinned();
    _unsubscribePinned = null;
  }
  _currentUserId = null;
  _unreadCount = 0;
  _pinnedCount = 0;
}
