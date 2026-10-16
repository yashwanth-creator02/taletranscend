// src/ui/components/nav/notifications.popover.js
// Handles notification popover toggling, real-time unread count updates, and rendering.

import {
  getUserNotifications,
  subscribeUnreadNotifications,
} from '@services/notification.service.js';
import { renderIcons } from './nav.utils.js';
import { timeAgo, escapeHtml } from '@/utils';

let _unsubscribe = null;
let _currentUserId = null;

/**
 * Updates the badge count on the notification bell button.
 *
 * @param {number} count
 */
export function updateNotificationBadge(count) {
  const badge = document.getElementById('nav-notifications-badge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
  }
}

/**
 * Loads and renders the latest notifications into the popover list.
 *
 * @param {string} userId
 */
export async function loadAndRenderNotifications(userId) {
  const listEl = document.getElementById('nav-notifications-list');
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="py-6 text-center text-slate-500">
      <div class="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-2"></div>
      <p class="text-[11px]">Reading sacred chronicles...</p>
    </div>
  `;

  const notifications = await getUserNotifications(userId, 20);

  if (!notifications || notifications.length === 0) {
    listEl.innerHTML =
      '<div class="py-6 text-center text-slate-500">No notices in the archive</div>';
    return;
  }

  listEl.innerHTML = notifications
    .map((item) => {
      const isUnread = !item.isRead;
      const formattedTime = item.createdAt ? timeAgo(item.createdAt) : 'Recently';
      const safeTitle = escapeHtml(item.title || 'Archival Update');
      const safeBody = escapeHtml(item.body || '');
      const href = item.link || '#';

      return `
        <a href="${href}" class="block p-2.5 rounded-lg transition-colors hover:bg-white/5 ${
          isUnread ? 'bg-indigo-950/20' : ''
        }">
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-medium text-slate-200 text-xs leading-snug">${safeTitle}</h4>
            <span class="text-[10px] text-slate-500 shrink-0">${formattedTime}</span>
          </div>
          ${safeBody ? `<p class="mt-1 text-[11px] text-slate-400 leading-normal line-clamp-2">${safeBody}</p>` : ''}
        </a>
      `;
    })
    .join('');

  renderIcons();
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
    if (_currentUserId) {
      loadAndRenderNotifications(_currentUserId);
    }
  } else {
    popover.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Initializes the notifications popover and real-time subscriber.
 *
 * @param {import('firebase/auth').User | null} user
 */
export function initNotifications(user) {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  _currentUserId = user?.uid || null;

  if (!_currentUserId) {
    updateNotificationBadge(0);
    return;
  }

  // Subscribe to real-time unread count updates
  _unsubscribe = subscribeUnreadNotifications(_currentUserId, (count) => {
    updateNotificationBadge(count);
  });
}

/**
 * Closes the notifications popover if open.
 */
export function closeNotificationsPopover() {
  const popover = document.getElementById('nav-notifications-popover');
  const btn = document.getElementById('nav-notifications-btn');
  if (!popover) return;
  popover.classList.add('hidden');
  btn?.setAttribute('aria-expanded', 'false');
}

/**
 * Cleans up notifications listeners and state.
 */
export function destroyNotifications() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _currentUserId = null;
}
