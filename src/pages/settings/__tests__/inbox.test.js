// src/pages/settings/__tests__/inbox.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const inboxMocks = vi.hoisted(() => ({
  getUserNotificationsPage: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  setNotificationPinned: vi.fn(),
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

vi.mock('@services/notification.service.js', () => ({
  INBOX_PAGE_SIZE: 20,
  getUserNotificationsPage: inboxMocks.getUserNotificationsPage,
  markNotificationAsRead: inboxMocks.markNotificationAsRead,
  markAllNotificationsAsRead: inboxMocks.markAllNotificationsAsRead,
  setNotificationPinned: inboxMocks.setNotificationPinned,
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
    <span id="settings-inbox-summary"></span>
    <button type="button" id="btn-mark-inbox-read" disabled></button>
    <button type="button" id="btn-refresh-inbox"></button>
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

  it('shows a sign-in state when no user is present', async () => {
    auth.currentUser = null;

    initSettingsInbox();
    await flush();

    expect(document.getElementById('settings-inbox-list')?.textContent).toContain(
      'Sign in to view your inbox.'
    );
    expect(inboxMocks.getUserNotificationsPage).not.toHaveBeenCalled();
  });
});
