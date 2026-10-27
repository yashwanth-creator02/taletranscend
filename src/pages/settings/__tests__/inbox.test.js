// src/pages/settings/__tests__/inbox.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const inboxMocks = vi.hoisted(() => ({
  getUserNotificationsPage: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markNotificationAsUnread: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  setNotificationPinned: vi.fn(),
  deleteNotification: vi.fn(),
  subscribeUnreadNotifications: vi.fn(),
  showConfirmModal: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: null },
  onAuthStateChanged: vi.fn((authInstance, callback) => {
    callback(authInstance.currentUser);
    return vi.fn();
  }),
}));

vi.mock('@ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@ui/components/confirmModal.js', () => ({
  showConfirmModal: inboxMocks.showConfirmModal,
}));

vi.mock('@services/notification.service.js', () => ({
  INBOX_PAGE_SIZE: 20,
  getUserNotificationsPage: inboxMocks.getUserNotificationsPage,
  markNotificationAsRead: inboxMocks.markNotificationAsRead,
  markNotificationAsUnread: inboxMocks.markNotificationAsUnread,
  markAllNotificationsAsRead: inboxMocks.markAllNotificationsAsRead,
  setNotificationPinned: inboxMocks.setNotificationPinned,
  deleteNotification: inboxMocks.deleteNotification,
  subscribeUnreadNotifications: inboxMocks.subscribeUnreadNotifications,
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    })),
  };
});

import { auth } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { initSettingsInbox, destroySettingsInbox } from '../inbox.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setupDom() {
  document.body.innerHTML = `
    <button type="button" id="settings-inbox-nav" aria-label="Inbox">
      <span class="settings-nav-badge" id="settings-inbox-unread" hidden></span>
    </button>
    <span id="settings-inbox-summary"></span>
    <button type="button" id="btn-mark-inbox-read" disabled></button>
    <button type="button" id="btn-refresh-inbox"></button>
    <select id="settings-inbox-type-filter">
      <option value="all">All messages</option>
      <option value="admin_message">Administrator messages</option>
      <option value="report_response">Report replies</option>
      <option value="moderation">Moderation notices</option>
      <option value="system">System notices</option>
      <option value="community">Community activity</option>
      <option value="other">Other</option>
    </select>
    <input id="settings-inbox-search" type="search" />
    <div id="settings-inbox-list" role="region" aria-label="Message list"></div>
    <p id="settings-inbox-announcer" class="sr-only" role="status" aria-live="polite"></p>
    <div id="settings-inbox-footer" hidden>
      <button type="button" id="btn-load-more-inbox"></button>
    </div>
  `;
}

function message(overrides = {}) {
  return {
    id: 'n1',
    type: 'admin_message',
    title: 'A notice from the archive',
    body: 'Hello reader',
    actionUrl: 'settings.html#section-inbox',
    isRead: false,
    isPinned: false,
    createdAt: new Date('2026-01-02T03:04:00Z'),
    ...overrides,
  };
}

function page(items, overrides = {}) {
  return {
    items,
    nextCursor: null,
    hasMore: false,
    ...overrides,
  };
}

describe('settings inbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { uid: 'reader-1', isAnonymous: false };
    setupDom();
    inboxMocks.getUserNotificationsPage.mockResolvedValue(page([]));
    inboxMocks.subscribeUnreadNotifications.mockReturnValue(vi.fn());
    inboxMocks.showConfirmModal.mockResolvedValue(true);
  });

  afterEach(() => {
    destroySettingsInbox();
    document.body.innerHTML = '';
  });

  it('renders messages with their type, unread state, and safe action link', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(page([message()]));

    initSettingsInbox();
    await flush();

    expect(inboxMocks.getUserNotificationsPage).toHaveBeenCalledWith('reader-1', {
      pageSize: 20,
      cursor: null,
    });

    const entry = document.querySelector('.settings-inbox-entry');
    expect(entry).not.toBeNull();
    expect(entry.textContent).toContain('Administrator message');
    expect(entry.textContent).toContain('A notice from the archive');
    expect(entry.textContent).toContain('Unread');
    expect(entry.querySelector('[data-inbox-open]')?.getAttribute('href')).toBe(
      '/settings.html#section-inbox'
    );
    expect(document.getElementById('settings-inbox-summary')?.textContent).toContain(
      '1 message / 1 unread'
    );
  });

  it('does not render an unsafe action link', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(
      page([message({ actionUrl: 'javascript:alert(1)' })])
    );

    initSettingsInbox();
    await flush();

    expect(document.querySelector('[data-inbox-open]')).toBeNull();
  });

  it('shows the empty state when there are no messages', async () => {
    initSettingsInbox();
    await flush();

    expect(document.getElementById('settings-inbox-list')?.textContent).toContain(
      'No messages yet'
    );
    expect(document.getElementById('settings-inbox-footer')?.hidden).toBe(true);
    expect(document.getElementById('btn-mark-inbox-read')?.disabled).toBe(true);
  });

  it('loads older messages with the cursor and hides the footer at the end', async () => {
    inboxMocks.getUserNotificationsPage
      .mockResolvedValueOnce(
        page([message({ id: 'n1' }), message({ id: 'n2', title: 'Second' })], {
          nextCursor: { id: 'n2' },
          hasMore: true,
        })
      )
      .mockResolvedValueOnce(page([message({ id: 'n3', title: 'Third' })]));

    initSettingsInbox();
    await flush();

    expect(document.getElementById('settings-inbox-footer')?.hidden).toBe(false);
    document.getElementById('btn-load-more-inbox')?.click();
    await flush();

    expect(inboxMocks.getUserNotificationsPage).toHaveBeenLastCalledWith('reader-1', {
      pageSize: 20,
      cursor: { id: 'n2' },
    });
    expect(document.querySelectorAll('.settings-inbox-entry')).toHaveLength(3);
    expect(document.getElementById('settings-inbox-footer')?.hidden).toBe(true);
  });

  it('keeps loaded messages when loading older messages fails', async () => {
    inboxMocks.getUserNotificationsPage
      .mockResolvedValueOnce(
        page([message({ id: 'n1' }), message({ id: 'n2', title: 'Second' })], {
          nextCursor: { id: 'n2' },
          hasMore: true,
        })
      )
      .mockRejectedValueOnce(new Error('permission-denied'));

    initSettingsInbox();
    await flush();

    document.getElementById('btn-load-more-inbox')?.click();
    await flush();

    expect(document.querySelectorAll('.settings-inbox-entry')).toHaveLength(2);
    expect(document.getElementById('settings-inbox-footer')?.hidden).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Older messages could not be loaded.', 'error');
  });

  it('marks one message read and updates the row', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(page([message()]));
    inboxMocks.markNotificationAsRead.mockResolvedValue(true);

    initSettingsInbox();
    await flush();

    document.querySelector('[data-inbox-read]')?.click();
    await flush();

    expect(inboxMocks.markNotificationAsRead).toHaveBeenCalledWith('reader-1', 'n1');
    expect(document.querySelector('.settings-inbox-entry--unread')).toBeNull();
    expect(document.querySelector('[data-inbox-read]')).toBeNull();
    expect(document.activeElement?.classList.contains('settings-inbox-entry')).toBe(true);
    expect(document.getElementById('settings-inbox-summary')?.textContent).toBe('1 message');
  });

  it('does not double-decrement the badge when the unread snapshot lands first', async () => {
    let unreadCallback = null;
    inboxMocks.getUserNotificationsPage.mockResolvedValue(page([message()]));
    inboxMocks.subscribeUnreadNotifications.mockImplementation((userId, callback) => {
      unreadCallback = callback;
      callback(2);
      return vi.fn();
    });
    inboxMocks.markNotificationAsRead.mockImplementation(async () => {
      unreadCallback?.(1);
      return true;
    });

    initSettingsInbox();
    await flush();

    document.querySelector('[data-inbox-read]')?.click();
    await flush();

    expect(document.getElementById('settings-inbox-unread')?.textContent).toBe('1');
  });

  it('marks a read message unread again', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(
      page([message({ isRead: true, actionUrl: '' })])
    );
    inboxMocks.markNotificationAsUnread.mockResolvedValue(true);

    initSettingsInbox();
    await flush();

    document.querySelector('[data-inbox-mark-unread]')?.click();
    await flush();

    expect(inboxMocks.markNotificationAsUnread).toHaveBeenCalledWith('reader-1', 'n1');
    expect(document.querySelector('.settings-inbox-entry--unread')).not.toBeNull();
    expect(document.querySelector('[data-inbox-read]')).not.toBeNull();
    expect(document.getElementById('settings-inbox-summary')?.textContent).toContain(
      '1 message / 1 unread'
    );
    expect(document.getElementById('settings-inbox-unread')?.textContent).toBe('1');
  });

  it('updates the unread badge from the subscription', async () => {
    inboxMocks.subscribeUnreadNotifications.mockImplementation((userId, callback) => {
      callback(3);
      return vi.fn();
    });

    initSettingsInbox();
    await flush();

    expect(inboxMocks.subscribeUnreadNotifications).toHaveBeenCalledWith(
      'reader-1',
      expect.any(Function)
    );
    const badge = document.getElementById('settings-inbox-unread');
    expect(badge?.textContent).toBe('3');
    expect(badge?.hidden).toBe(false);
    expect(document.getElementById('settings-inbox-nav')?.getAttribute('aria-label')).toBe(
      'Inbox, 3 unread'
    );
  });

  it('filters messages by type', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(
      page([
        message({ id: 'n1', type: 'admin_message', title: 'Admin note' }),
        message({ id: 'n2', type: 'report_response', title: 'Report reply' }),
      ])
    );

    initSettingsInbox();
    await flush();

    const select = /** @type {HTMLSelectElement} */ (
      document.getElementById('settings-inbox-type-filter')
    );
    select.value = 'report_response';
    select.dispatchEvent(new Event('change'));

    expect(document.querySelectorAll('.settings-inbox-entry')).toHaveLength(1);
    expect(document.querySelector('.settings-inbox-entry')?.textContent).toContain('Report reply');
    expect(document.getElementById('settings-inbox-summary')?.textContent).toContain(
      '1 of 2 messages'
    );
  });

  it('searches messages by title and body', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(
      page([
        message({ id: 'n1', title: 'A notice from the archive' }),
        message({ id: 'n2', title: 'Second notice', body: 'Different body' }),
      ])
    );

    initSettingsInbox();
    await flush();

    const search = /** @type {HTMLInputElement} */ (
      document.getElementById('settings-inbox-search')
    );
    search.value = 'different body';
    search.dispatchEvent(new Event('input'));

    expect(document.querySelectorAll('.settings-inbox-entry')).toHaveLength(1);
    expect(document.querySelector('.settings-inbox-entry')?.textContent).toContain('Second notice');
  });

  it('deletes a message after confirmation', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(page([message()]));
    inboxMocks.deleteNotification.mockResolvedValue(true);

    initSettingsInbox();
    await flush();

    document.querySelector('[data-inbox-delete]')?.click();
    await flush();

    expect(inboxMocks.showConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete this message?',
        confirmText: 'Delete message',
        confirmVariant: 'danger',
      })
    );
    expect(inboxMocks.deleteNotification).toHaveBeenCalledWith('reader-1', 'n1');
    expect(document.querySelector('.settings-inbox-entry')).toBeNull();
    expect(showToast).toHaveBeenCalledWith('Message deleted.', 'success');
  });

  it('keeps the message when deletion is cancelled', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(page([message()]));
    inboxMocks.showConfirmModal.mockResolvedValue(false);

    initSettingsInbox();
    await flush();

    document.querySelector('[data-inbox-delete]')?.click();
    await flush();

    expect(inboxMocks.deleteNotification).not.toHaveBeenCalled();
    expect(document.querySelector('.settings-inbox-entry')).not.toBeNull();
  });

  it('links report replies to the report thread instead of the inbox', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(
      page([
        message({
          type: 'report_response',
          reportId: 'report-1',
          title: 'Your report was reviewed',
        }),
      ])
    );

    initSettingsInbox();
    await flush();

    expect(document.querySelector('[data-inbox-open]')).toBeNull();
    expect(document.querySelector('[data-inbox-report]')?.getAttribute('href')).toBe(
      '/settings.html#section-support'
    );
  });

  it('pins a message and updates the control state', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(page([message()]));
    inboxMocks.setNotificationPinned.mockResolvedValue(true);

    initSettingsInbox();
    await flush();

    document.querySelector('[data-inbox-pin]')?.click();
    await flush();

    expect(inboxMocks.setNotificationPinned).toHaveBeenCalledWith('reader-1', 'n1', true);
    expect(document.querySelector('[data-inbox-pin]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-inbox-pin]')?.textContent).toContain('Unpin');
  });

  it('marks all messages read', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(
      page([message({ id: 'n1' }), message({ id: 'n2', title: 'Second' })])
    );
    inboxMocks.markAllNotificationsAsRead.mockResolvedValue(true);

    initSettingsInbox();
    await flush();

    document.getElementById('btn-mark-inbox-read')?.click();
    await flush();

    expect(inboxMocks.markAllNotificationsAsRead).toHaveBeenCalledWith('reader-1');
    expect(document.querySelectorAll('.settings-inbox-entry--unread')).toHaveLength(0);
    expect(showToast).toHaveBeenCalledWith('All messages marked as read.', 'success');
  });

  it('allows mark-all when older pages may contain unread messages', async () => {
    inboxMocks.getUserNotificationsPage.mockResolvedValue(
      page([message({ id: 'n1', isRead: true }), message({ id: 'n2', isRead: true })], {
        hasMore: true,
        nextCursor: { id: 'n2' },
      })
    );
    inboxMocks.markAllNotificationsAsRead.mockResolvedValue(true);

    initSettingsInbox();
    await flush();

    const markAll = document.getElementById('btn-mark-inbox-read');
    expect(markAll?.disabled).toBe(false);
    expect(document.getElementById('settings-inbox-summary')?.textContent).toContain(
      'older pages may contain unread'
    );

    markAll?.click();
    await flush();

    expect(inboxMocks.markAllNotificationsAsRead).toHaveBeenCalledWith('reader-1');
    expect(markAll?.disabled).toBe(true);
  });

  it('hides the inbox from guests without reading notifications', async () => {
    auth.currentUser = { uid: 'guest-1', isAnonymous: true };

    initSettingsInbox();
    await flush();

    expect(document.getElementById('settings-inbox-list')?.textContent).toContain(
      'Connect an email or Google account'
    );
    expect(inboxMocks.getUserNotificationsPage).not.toHaveBeenCalled();
    expect(inboxMocks.subscribeUnreadNotifications).not.toHaveBeenCalled();
  });

  it('shows a sign-in state when no user is present', async () => {
    auth.currentUser = null;

    initSettingsInbox();
    await flush();

    expect(document.getElementById('settings-inbox-list')?.textContent).toContain(
      'Connect an email or Google account'
    );
    expect(inboxMocks.getUserNotificationsPage).not.toHaveBeenCalled();
  });
});
