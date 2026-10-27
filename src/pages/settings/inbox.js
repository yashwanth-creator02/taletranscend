// src/pages/settings/inbox.js
// Settings inbox: a complete, paginated view of the signed-in user's notices.
// Messages live at users/{uid}/notifications and are written by staff services.

import { auth, onAuthStateChanged } from '@fb/index.js';
import { initIcons } from '@ui/icons.js';
import { showToast } from '@ui/components/toast.js';
import { createLogger, escapeHtml, resolveSafeInternalHref } from '@/utils';
import {
  INBOX_PAGE_SIZE,
  getUserNotificationsPage,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  setNotificationPinned,
} from '@services/notification.service.js';

const log = createLogger('SettingsInbox');

const NOTIFICATION_TYPE_LABELS = Object.freeze({
  report_response: 'Report reply',
  admin_message: 'Administrator message',
  moderation: 'Moderation notice',
  system: 'System notice',
  new_comment: 'New comment',
  reply: 'Reply',
  new_chapter: 'New chapter',
  new_follower: 'New follower',
  tale_featured: 'Tale featured',
});

let unsubscribeAuth = null;
let boundList = null;
const boundButtons = [];
const busyIds = new Set();
let currentUserId = null;
let items = [];
let nextCursor = null;
let hasMore = false;
let loading = false;
let bulkBusy = false;
let sweptAllRead = false;
let requestToken = 0;

/**
 * Resolves a notification type to its visible label.
 *
 * @param {string} type
 * @returns {string}
 */
function notificationTypeLabel(type) {
  return Object.hasOwn(NOTIFICATION_TYPE_LABELS, type)
    ? NOTIFICATION_TYPE_LABELS[type]
    : 'Archive notice';
}

/**
 * Normalizes a Firestore Timestamp, Date, millis value, or date string.
 *
 * @param {unknown} value
 * @returns {Date | null}
 */
function toDate(value) {
  if (!value) return null;

  let date;
  try {
    if (value instanceof Date) date = value;
    else if (typeof value.toDate === 'function') date = value.toDate();
    else if (typeof value.toMillis === 'function') date = new Date(value.toMillis());
    else if (typeof value.seconds === 'number') date = new Date(value.seconds * 1000);
    else date = new Date(value);
  } catch {
    return null;
  }

  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * Formats a message timestamp for the inbox row.
 *
 * @param {unknown} value
 * @returns {{ label: string, iso: string }}
 */
function formatNotificationDate(value) {
  const date = toDate(value);
  if (!date) return { label: 'Recently', iso: '' };

  return {
    label: date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    iso: date.toISOString(),
  };
}

/**
 * Returns the inbox list element, if present.
 *
 * @returns {HTMLElement | null}
 */
function getListElement() {
  return document.getElementById('settings-inbox-list');
}

/**
 * Announces a short inbox status without re-reading the whole message list.
 *
 * @param {string} message
 */
function announce(message) {
  const announcer = document.getElementById('settings-inbox-announcer');
  if (announcer) announcer.textContent = message;
}

/**
 * Finds a rendered inbox row by notification ID.
 *
 * @param {string} notificationId
 * @returns {HTMLElement | null}
 */
function findRow(notificationId) {
  const listEl = getListElement();
  if (!listEl) return null;

  return (
    Array.from(listEl.querySelectorAll('[data-notification-id]')).find(
      (row) => row.dataset.notificationId === notificationId
    ) ?? null
  );
}

/**
 * Finds the pin control for a rendered message.
 *
 * @param {string} notificationId
 * @returns {HTMLElement | null}
 */
function findPinButton(notificationId) {
  return findRow(notificationId)?.querySelector('[data-inbox-pin]') ?? null;
}

/**
 * Builds one message row.
 *
 * @param {import('@state/schemas/notification.schema.js').Notification} item
 * @returns {string}
 */
function buildEntry(item) {
  const isUnread = !item.isRead;
  const isPinned = Boolean(item.isPinned);
  const href = resolveSafeInternalHref(item.actionUrl ?? item.link);
  const date = formatNotificationDate(item.createdAt);
  const safeId = escapeHtml(item.id);
  const safeTitle = escapeHtml(item.title || 'Archive notice');
  const safeBody = escapeHtml(item.body || '').replace(/\r?\n/g, '<br />');
  const typeLabel = escapeHtml(notificationTypeLabel(item.type));
  const labels = [
    isUnread
      ? '<span class="settings-inbox-entry__label" data-inbox-unread-label>Unread</span>'
      : '',
    isPinned
      ? '<span class="settings-inbox-entry__label settings-inbox-entry__label--pinned">Pinned</span>'
      : '',
  ].filter(Boolean);

  return `
    <article
      class="settings-inbox-entry${isUnread ? ' settings-inbox-entry--unread' : ''}"
      data-notification-id="${safeId}"
      tabindex="-1"
    >
      <div class="settings-inbox-entry__head">
        <div class="settings-inbox-entry__heading">
          <span class="settings-inbox-entry__type">${typeLabel}</span>
          <h3 class="settings-inbox-entry__title">${safeTitle}</h3>
        </div>
        <time class="settings-inbox-entry__time"${date.iso ? ` datetime="${date.iso}"` : ''}>
          ${date.label}
        </time>
      </div>
      ${labels.length ? `<div class="settings-inbox-entry__meta">${labels.join('')}</div>` : ''}
      ${safeBody ? `<p class="settings-inbox-entry__body">${safeBody}</p>` : ''}
      <div class="settings-inbox-entry__actions">
        ${
          href
            ? `<a href="${escapeHtml(href)}" class="settings-btn-secondary" data-inbox-open aria-label="Open message: ${safeTitle}">Open</a>`
            : ''
        }
        ${
          isUnread
            ? `<button type="button" class="settings-btn-secondary" data-inbox-read aria-label="Mark read: ${safeTitle}">Mark read</button>`
            : ''
        }
        <button
          type="button"
          class="settings-btn-secondary"
          data-inbox-pin
          aria-pressed="${isPinned}"
          aria-label="${isPinned ? 'Unpin' : 'Pin'} message: ${safeTitle}"
        >
          ${isPinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    </article>
  `;
}

/**
 * Updates the toolbar summary and control states from the current items.
 */
function updateSummary() {
  const summaryEl = document.getElementById('settings-inbox-summary');
  const markAllBtn = document.getElementById('btn-mark-inbox-read');
  const unread = items.filter((item) => !item.isRead).length;
  const olderMayBeUnread = hasMore && !sweptAllRead;

  if (summaryEl) {
    if (!currentUserId) {
      summaryEl.textContent = 'Not signed in';
    } else if (!items.length) {
      summaryEl.textContent = 'No messages';
    } else {
      summaryEl.textContent = `${items.length} ${items.length === 1 ? 'message' : 'messages'}${
        unread ? ` / ${unread} unread` : olderMayBeUnread ? ' / older pages may contain unread' : ''
      }`;
    }
  }

  if (markAllBtn) {
    markAllBtn.disabled =
      !currentUserId || loading || bulkBusy || (unread === 0 && !olderMayBeUnread);
  }
}

/**
 * Renders the empty state and clears paging controls.
 *
 * @param {string} message
 */
function renderEmpty(message) {
  const listEl = getListElement();
  const footer = document.getElementById('settings-inbox-footer');
  const refreshBtn = document.getElementById('btn-refresh-inbox');

  if (listEl) {
    listEl.setAttribute('aria-busy', 'false');
    listEl.innerHTML = `<p class="settings-inbox-empty">${escapeHtml(message)}</p>`;
  }
  if (footer) footer.hidden = true;
  if (refreshBtn) refreshBtn.disabled = !currentUserId;

  updateSummary();
}

/**
 * Renders the loading state.
 */
function renderLoading() {
  const listEl = getListElement();
  const footer = document.getElementById('settings-inbox-footer');
  const loadMoreBtn = document.getElementById('btn-load-more-inbox');
  const refreshBtn = document.getElementById('btn-refresh-inbox');
  const markAllBtn = document.getElementById('btn-mark-inbox-read');
  const summaryEl = document.getElementById('settings-inbox-summary');

  if (listEl) {
    listEl.setAttribute('aria-busy', 'true');
    listEl.innerHTML = '<p class="settings-inbox-empty">Reading your messages...</p>';
  }
  if (footer) footer.hidden = true;
  if (loadMoreBtn) loadMoreBtn.disabled = true;
  if (refreshBtn) refreshBtn.disabled = true;
  if (markAllBtn) markAllBtn.disabled = true;
  if (summaryEl) summaryEl.textContent = 'Reading your messages...';
}

/**
 * Renders all currently loaded messages.
 */
function renderInbox() {
  const listEl = getListElement();
  const footer = document.getElementById('settings-inbox-footer');
  const loadMoreBtn = document.getElementById('btn-load-more-inbox');
  const refreshBtn = document.getElementById('btn-refresh-inbox');

  if (!listEl) return;

  if (!items.length) {
    renderEmpty(
      'No messages yet. Administrator messages, report replies, and archive notices will appear here.'
    );
    return;
  }

  listEl.setAttribute('aria-busy', 'false');
  listEl.innerHTML = items.map(buildEntry).join('');
  if (footer) footer.hidden = !hasMore;
  if (loadMoreBtn) loadMoreBtn.disabled = false;
  if (refreshBtn) refreshBtn.disabled = false;

  updateSummary();
  // Notification bodies and icons are rendered after the async page load.
  initIcons(listEl);
}

/**
 * Loads one page of messages.
 *
 * @param {{ reset: boolean }} options
 */
async function loadInbox({ reset }) {
  if (loading) return;

  if (!currentUserId) {
    renderEmpty('Sign in to view your inbox.');
    return;
  }

  loading = true;
  const token = ++requestToken;

  if (reset) {
    items = [];
    nextCursor = null;
    hasMore = false;
    sweptAllRead = false;
    renderLoading();
  } else {
    const refreshBtn = document.getElementById('btn-refresh-inbox');
    const loadMoreBtn = document.getElementById('btn-load-more-inbox');
    if (refreshBtn) refreshBtn.disabled = true;
    if (loadMoreBtn) loadMoreBtn.disabled = true;
  }

  let result;
  try {
    result = await getUserNotificationsPage(currentUserId, {
      pageSize: INBOX_PAGE_SIZE,
      cursor: reset ? null : nextCursor,
    });
  } catch (error) {
    if (token !== requestToken) return;
    loading = false;
    log.error('Failed to load the settings inbox:', error);

    if (reset || !items.length) {
      renderEmpty('The archive could not be read. Refresh to try again.');
      announce('The archive could not be read.');
    } else {
      renderInbox();
      showToast('Older messages could not be loaded.', 'error');
      announce('Older messages could not be loaded.');
    }
    return;
  }

  if (token !== requestToken) return;

  const pageItems = Array.isArray(result?.items) ? result.items : [];
  items = reset ? pageItems : [...items, ...pageItems];
  nextCursor = result?.nextCursor ?? null;
  hasMore = Boolean(result?.hasMore);
  loading = false;

  if (!items.length) {
    renderEmpty(
      'No messages yet. Administrator messages, report replies, and archive notices will appear here.'
    );
    announce('No messages.');
    return;
  }

  renderInbox();
  announce(
    reset
      ? `${items.length} ${items.length === 1 ? 'message' : 'messages'} loaded.`
      : `${pageItems.length} older ${pageItems.length === 1 ? 'message' : 'messages'} loaded.`
  );
}

/**
 * Marks one message as read and updates its row in place.
 *
 * @param {string} notificationId
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
async function markOneRead(notificationId, { silent = false } = {}) {
  if (!currentUserId || !notificationId || busyIds.has(notificationId)) return false;

  const item = items.find((entry) => entry.id === notificationId);
  if (!item || item.isRead) return false;

  const row = findRow(notificationId);
  const readButton = row?.querySelector('[data-inbox-read]') ?? null;
  busyIds.add(notificationId);
  if (readButton) readButton.disabled = true;

  const updated = await markNotificationAsRead(currentUserId, notificationId);
  busyIds.delete(notificationId);

  if (!updated) {
    if (readButton) readButton.disabled = false;
    if (!silent) showToast('The message could not be marked as read.', 'error');
    return false;
  }

  item.isRead = true;
  if (row) {
    row.classList.remove('settings-inbox-entry--unread');
    row.querySelector('[data-inbox-unread-label]')?.remove();
    row.querySelector('[data-inbox-read]')?.remove();
    row.focus({ preventScroll: true });
  }
  announce('Message marked as read.');
  updateSummary();
  return true;
}

/**
 * Toggles the pinned state of one message.
 *
 * @param {string} notificationId
 */
async function togglePin(notificationId) {
  if (!currentUserId || !notificationId || busyIds.has(notificationId)) return;

  const item = items.find((entry) => entry.id === notificationId);
  if (!item) return;

  const nextPinned = !item.isPinned;
  const pinButton = findPinButton(notificationId);
  busyIds.add(notificationId);
  if (pinButton) pinButton.disabled = true;

  const updated = await setNotificationPinned(currentUserId, notificationId, nextPinned);
  busyIds.delete(notificationId);

  if (!updated) {
    if (pinButton) pinButton.disabled = false;
    showToast('The message could not be updated.', 'error');
    return;
  }

  item.isPinned = nextPinned;
  renderInbox();
  findPinButton(notificationId)?.focus();
  announce(nextPinned ? 'Message pinned.' : 'Message unpinned.');
}

/**
 * Marks every loaded message as read, and every stored unread message through
 * the service's paged sweep.
 */
async function markAllRead() {
  if (!currentUserId || loading || bulkBusy) return;

  bulkBusy = true;
  updateSummary();

  const updated = await markAllNotificationsAsRead(currentUserId);
  bulkBusy = false;

  if (!updated) {
    updateSummary();
    showToast('Messages could not be marked as read.', 'error');
    return;
  }

  sweptAllRead = true;
  items = items.map((item) => ({ ...item, isRead: true }));
  renderInbox();
  showToast('All messages marked as read.', 'success');
  announce('All messages marked as read.');
}

/**
 * Handles delegated inbox actions.
 *
 * @param {MouseEvent} event
 */
async function handleListClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;

  const row = target.closest('[data-notification-id]');
  const notificationId = row?.dataset.notificationId;
  if (!row || !notificationId) return;

  const pinButton = target.closest('[data-inbox-pin]');
  if (pinButton) {
    event.preventDefault();
    await togglePin(notificationId);
    return;
  }

  const readButton = target.closest('[data-inbox-read]');
  if (readButton) {
    event.preventDefault();
    await markOneRead(notificationId);
    return;
  }

  const openLink = target.closest('[data-inbox-open]');
  if (!openLink) return;

  // Preserve browser and assistive-technology link semantics for modified clicks.
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const item = items.find((entry) => entry.id === notificationId);
  if (!item || item.isRead) return;

  event.preventDefault();
  await markOneRead(notificationId, { silent: true });

  const href = openLink.getAttribute('href');
  if (href) {
    window.location.assign(href);
  }
}

/**
 * Binds the settings inbox controls and auth subscription.
 *
 * @returns {void}
 */
export function initSettingsInbox() {
  const listEl = getListElement();
  if (!listEl || boundList === listEl) return;

  boundList = listEl;
  listEl.addEventListener('click', handleListClick);

  const bindButton = (id, handler) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener('click', handler);
    boundButtons.push({ element, handler });
  };

  bindButton('btn-refresh-inbox', () => {
    if (currentUserId) void loadInbox({ reset: true });
  });

  bindButton('btn-mark-inbox-read', () => {
    void markAllRead();
  });

  bindButton('btn-load-more-inbox', () => {
    if (currentUserId && hasMore && !loading) void loadInbox({ reset: false });
  });

  unsubscribeAuth?.();
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    requestToken += 1;
    currentUserId = user?.uid || null;
    items = [];
    nextCursor = null;
    hasMore = false;
    loading = false;
    bulkBusy = false;
    sweptAllRead = false;
    busyIds.clear();

    if (!currentUserId) {
      renderEmpty('Sign in to view your inbox.');
      return;
    }

    void loadInbox({ reset: true });
  });
}

/**
 * Cleans up the settings inbox listeners and state.
 */
export function destroySettingsInbox() {
  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = null;
  }

  const listEl = getListElement();
  if (listEl && boundList === listEl) {
    listEl.removeEventListener('click', handleListClick);
  }

  for (const { element, handler } of boundButtons) {
    element.removeEventListener('click', handler);
  }
  boundButtons.length = 0;
  busyIds.clear();

  boundList = null;
  currentUserId = null;
  items = [];
  nextCursor = null;
  hasMore = false;
  loading = false;
  bulkBusy = false;
  sweptAllRead = false;
  requestToken = 0;
}
