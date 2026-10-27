// src/pages/settings/inbox.js
// Settings inbox: a complete, paginated view of the signed-in user's notices.
// Messages live at users/{uid}/notifications and are written by staff services.

import { auth, onAuthStateChanged } from '@fb/index.js';
import { initIcons } from '@ui/icons.js';
import { showToast } from '@ui/components/toast.js';
import { showConfirmModal } from '@ui/components/confirmModal.js';
import { isRegisteredUser } from '@services/auth.guard.js';
import { createLogger, escapeHtml, resolveSafeInternalHref } from '@/utils';
import {
  INBOX_PAGE_SIZE,
  deleteNotification,
  getUserNotificationsPage,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
  setNotificationPinned,
  subscribeUnreadNotifications,
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

/** Community activity grouped under one filter option. */
const COMMUNITY_TYPES = new Set([
  'new_comment',
  'reply',
  'new_chapter',
  'new_follower',
  'tale_featured',
]);

/** Notification types with a dedicated filter option. */
const DIRECT_TYPE_FILTERS = new Set(['admin_message', 'report_response', 'moderation', 'system']);

const REPORT_THREAD_HREF = resolveSafeInternalHref('settings.html#section-support');
const GUEST_INBOX_MESSAGE = 'Connect an email or Google account in Accounts to use the inbox.';

let unsubscribeAuth = null;
let unsubscribeUnread = null;
let boundList = null;
const boundButtons = [];
const boundFilters = [];
const busyIds = new Set();
let currentUserId = null;
let items = [];
let nextCursor = null;
let hasMore = false;
let loading = false;
let bulkBusy = false;
let sweptAllRead = false;
let requestToken = 0;
let unreadCount = 0;
let unreadVersion = 0;
let typeFilter = 'all';
let searchQuery = '';

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
 * Returns true when a message matches the selected type filter.
 *
 * @param {{ type?: string }} item
 * @returns {boolean}
 */
function matchesTypeFilter(item) {
  if (typeFilter === 'all') return true;
  if (typeFilter === 'community') return COMMUNITY_TYPES.has(item.type);
  if (typeFilter === 'other') {
    return !DIRECT_TYPE_FILTERS.has(item.type) && !COMMUNITY_TYPES.has(item.type);
  }
  return item.type === typeFilter;
}

/**
 * Returns true when a message matches the current free-text search.
 *
 * @param {{ type?: string, title?: string, body?: string }} item
 * @returns {boolean}
 */
function matchesSearch(item) {
  if (!searchQuery) return true;

  const haystack =
    `${item.title || ''} ${item.body || ''} ${notificationTypeLabel(item.type)}`.toLowerCase();
  return haystack.includes(searchQuery);
}

/**
 * Returns the messages currently visible under the active filters.
 *
 * @returns {Array<import('@state/schemas/notification.schema.js').Notification>}
 */
function visibleItems() {
  return items.filter((item) => matchesTypeFilter(item) && matchesSearch(item));
}

/**
 * Updates the sidebar unread badge and the Inbox button's accessible name.
 *
 * @param {number} [count]
 */
function updateUnreadBadge(count = unreadCount) {
  unreadCount = Math.max(0, Number.isFinite(count) ? count : 0);

  const badge = document.getElementById('settings-inbox-unread');
  const nav = document.getElementById('settings-inbox-nav');

  if (badge) {
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    badge.hidden = unreadCount === 0;
  }

  if (nav) {
    nav.setAttribute('aria-label', unreadCount ? `Inbox, ${unreadCount} unread` : 'Inbox');
  }
}

/**
 * Applies a relative change to the unread badge without going below zero.
 *
 * @param {number} delta
 */
function adjustUnreadCount(delta) {
  updateUnreadBadge(Math.max(0, unreadCount + delta));
}

/**
 * Clears the type and text filters, including their controls.
 */
function resetFilters() {
  typeFilter = 'all';
  searchQuery = '';

  const typeEl = document.getElementById('settings-inbox-type-filter');
  if (typeEl instanceof HTMLSelectElement) typeEl.value = 'all';

  const searchEl = document.getElementById('settings-inbox-search');
  if (searchEl instanceof HTMLInputElement) searchEl.value = '';
}

/**
 * Subscribes the sidebar badge to the registered user's unread count.
 *
 * @param {string} userId
 */
function subscribeToUnread(userId) {
  unsubscribeUnread?.();
  unsubscribeUnread = subscribeUnreadNotifications(userId, (count) => {
    unreadVersion += 1;
    updateUnreadBadge(count);
  });
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
  const isReportReply = item.type === 'report_response' && Boolean(item.reportId);
  // A report reply's actionUrl points back at the inbox, so it gets a direct
  // link to the report thread instead of a redundant Open action.
  const href = isReportReply ? '' : resolveSafeInternalHref(item.actionUrl ?? item.link);
  const reportHref = isReportReply ? REPORT_THREAD_HREF : '';
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
          reportHref
            ? `<a href="${escapeHtml(reportHref)}" class="settings-btn-secondary" data-inbox-report aria-label="View report thread: ${safeTitle}">View report thread</a>`
            : ''
        }
        ${
          isUnread
            ? `<button type="button" class="settings-btn-secondary" data-inbox-read aria-label="Mark read: ${safeTitle}">Mark read</button>`
            : `<button type="button" class="settings-btn-secondary" data-inbox-mark-unread aria-label="Mark unread: ${safeTitle}">Mark unread</button>`
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
        <button
          type="button"
          class="settings-btn-secondary settings-btn-danger"
          data-inbox-delete
          aria-label="Delete message: ${safeTitle}"
        >
          Delete
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
  const visible = visibleItems();
  const unread = items.filter((item) => !item.isRead).length;
  const olderMayBeUnread = hasMore && !sweptAllRead;
  const filtered = typeFilter !== 'all' || searchQuery.length > 0;

  if (summaryEl) {
    if (!currentUserId) {
      summaryEl.textContent = 'Not signed in';
    } else if (!items.length) {
      summaryEl.textContent = 'No messages';
    } else if (!visible.length) {
      summaryEl.textContent = 'No messages match these filters';
    } else {
      const countLabel = filtered
        ? `${visible.length} of ${items.length} ${items.length === 1 ? 'message' : 'messages'}`
        : `${visible.length} ${visible.length === 1 ? 'message' : 'messages'}`;
      summaryEl.textContent = `${countLabel}${
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

  const visible = visibleItems();
  listEl.setAttribute('aria-busy', 'false');

  if (!visible.length) {
    listEl.innerHTML = '<p class="settings-inbox-empty">No messages match these filters.</p>';
    // Keep the pager available so a filter can still reach older pages.
    if (footer) footer.hidden = !hasMore;
    if (loadMoreBtn) loadMoreBtn.disabled = false;
    if (refreshBtn) refreshBtn.disabled = false;
    updateSummary();
    return;
  }

  listEl.innerHTML = visible.map(buildEntry).join('');
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
    renderEmpty(GUEST_INBOX_MESSAGE);
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

  const unreadVersionBefore = unreadVersion;
  const updated = await markNotificationAsRead(currentUserId, notificationId);
  busyIds.delete(notificationId);

  if (!updated) {
    if (readButton) readButton.disabled = false;
    if (!silent) showToast('The message could not be marked as read.', 'error');
    return false;
  }

  item.isRead = true;
  // The live subscription may already include this write; only apply the
  // optimistic delta when no snapshot arrived while the write was in flight.
  if (unreadVersion === unreadVersionBefore) adjustUnreadCount(-1);
  renderInbox();
  findRow(notificationId)?.focus({ preventScroll: true });
  announce('Message marked as read.');
  return true;
}

/**
 * Marks one read message as unread again.
 *
 * @param {string} notificationId
 * @returns {Promise<boolean>}
 */
async function markOneUnread(notificationId) {
  if (!currentUserId || !notificationId || busyIds.has(notificationId)) return false;

  const item = items.find((entry) => entry.id === notificationId);
  if (!item || !item.isRead) return false;

  const row = findRow(notificationId);
  const unreadButton = row?.querySelector('[data-inbox-mark-unread]') ?? null;
  busyIds.add(notificationId);
  if (unreadButton) unreadButton.disabled = true;

  const unreadVersionBefore = unreadVersion;
  const updated = await markNotificationAsUnread(currentUserId, notificationId);
  busyIds.delete(notificationId);

  if (!updated) {
    if (unreadButton) unreadButton.disabled = false;
    showToast('The message could not be marked as unread.', 'error');
    return false;
  }

  item.isRead = false;
  if (unreadVersion === unreadVersionBefore) adjustUnreadCount(1);
  renderInbox();
  findRow(notificationId)?.focus({ preventScroll: true });
  announce('Message marked as unread.');
  return true;
}

/**
 * Permanently deletes one message after confirmation.
 *
 * @param {string} notificationId
 */
async function deleteOne(notificationId) {
  if (!currentUserId || !notificationId || busyIds.has(notificationId)) return;

  const item = items.find((entry) => entry.id === notificationId);
  if (!item) return;

  const confirmed = await showConfirmModal({
    title: 'Delete this message?',
    message: 'This removes the message from your inbox permanently. This cannot be undone.',
    confirmText: 'Delete message',
    confirmVariant: 'danger',
    icon: 'trash-2',
  });
  if (!confirmed || !currentUserId || busyIds.has(notificationId)) return;

  busyIds.add(notificationId);
  const unreadVersionBefore = unreadVersion;
  const deleted = await deleteNotification(currentUserId, notificationId);
  busyIds.delete(notificationId);

  if (!deleted) {
    showToast('The message could not be deleted.', 'error');
    return;
  }

  if (!item.isRead && unreadVersion === unreadVersionBefore) adjustUnreadCount(-1);
  items = items.filter((entry) => entry.id !== notificationId);
  renderInbox();
  showToast('Message deleted.', 'success');
  announce('Message deleted.');
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
  updateUnreadBadge(0);
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

  const unreadButton = target.closest('[data-inbox-mark-unread]');
  if (unreadButton) {
    event.preventDefault();
    await markOneUnread(notificationId);
    return;
  }

  const deleteButton = target.closest('[data-inbox-delete]');
  if (deleteButton) {
    event.preventDefault();
    await deleteOne(notificationId);
    return;
  }

  const openLink = target.closest('[data-inbox-open], [data-inbox-report]');
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

  const bindFilter = (element, eventName, handler) => {
    if (!element) return;
    element.addEventListener(eventName, handler);
    boundFilters.push({ element, eventName, handler });
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

  const typeFilterEl = document.getElementById('settings-inbox-type-filter');
  if (typeFilterEl instanceof HTMLSelectElement) {
    typeFilterEl.value = typeFilter;
    bindFilter(typeFilterEl, 'change', () => {
      typeFilter = typeFilterEl.value || 'all';
      renderInbox();
    });
  }

  const searchEl = document.getElementById('settings-inbox-search');
  if (searchEl instanceof HTMLInputElement) {
    searchEl.value = searchQuery;
    bindFilter(searchEl, 'input', () => {
      searchQuery = searchEl.value.trim().toLowerCase();
      renderInbox();
    });
  }

  unsubscribeAuth?.();
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    requestToken += 1;
    const registered = isRegisteredUser(user);
    currentUserId = registered ? user.uid : null;
    items = [];
    nextCursor = null;
    hasMore = false;
    loading = false;
    bulkBusy = false;
    sweptAllRead = false;
    busyIds.clear();
    resetFilters();

    unsubscribeUnread?.();
    unsubscribeUnread = null;
    updateUnreadBadge(0);

    if (!registered) {
      // Guests are anonymous Firebase sessions. They must never trigger a
      // notification read; the Inbox panel itself is hidden for them.
      renderEmpty(GUEST_INBOX_MESSAGE);
      return;
    }

    subscribeToUnread(currentUserId);
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

  unsubscribeUnread?.();
  unsubscribeUnread = null;

  const listEl = getListElement();
  if (listEl && boundList === listEl) {
    listEl.removeEventListener('click', handleListClick);
  }

  for (const { element, handler } of boundButtons) {
    element.removeEventListener('click', handler);
  }
  boundButtons.length = 0;

  for (const { element, eventName, handler } of boundFilters) {
    element.removeEventListener(eventName, handler);
  }
  boundFilters.length = 0;
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
  resetFilters();
  updateUnreadBadge(0);
}
