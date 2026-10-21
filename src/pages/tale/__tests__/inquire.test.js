// src/pages/tale/__tests__/inquire.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setupInquire,
  getStoredInquiries,
  saveStoredInquiries,
  getBlockedSenders,
  saveBlockedSender,
  replyToMissive,
  reportMissive,
  blockSender,
} from '../inquire.js';
import * as toast from '@ui/components/toast.js';

vi.mock('@fb/index.js', () => ({
  auth: {
    currentUser: { uid: 'user-456', displayName: 'Valiant Reader', email: 'reader@test.com' },
  },
  refs: {
    inquiries: vi.fn(() => 'mock-inquiries-ref'),
    inquiry: vi.fn((id) => `mock-inquiries-ref/${id}`),
  },
  addDoc: vi.fn(() => Promise.resolve({ id: 'doc-123' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@services/author.service.js', () => ({
  getAuthorStatus: vi.fn(() =>
    Promise.resolve({
      isAuthor: true,
      penName: 'Master Chronicler',
      authorEmail: 'author@chronicles.com',
    })
  ),
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
  escapeHtml: vi.fn((str) => str),
}));

describe('Chronicle Missives System', () => {
  let mockTale;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    mockTale = {
      title: 'Echoes of the Void',
      authorId: 'author-789',
      authorName: 'Master Chronicler',
      authorBio: 'Keeper of ancient memories.',
      authorAvatarUrl: 'https://example.com/avatar.png',
    };

    document.body.innerHTML = `
      <div id="content-about" class="tab-content">
        <button id="btn-open-chronicler-letter" type="button"></button>
      </div>
      <button data-tab="letter" id="tab-btn-letter"></button>
      <div class="chronicler-invite-card"></div>
      <div id="content-letter" class="tab-content hidden">

        <!-- Author Mailroom View -->
        <div id="author-missives-view" class="hidden">
          <span id="author-stat-total">0</span>
          <span id="author-stat-pending">0</span>
          <span id="author-stat-replied">0</span>
          <div id="author-missives-filter-chips">
            <button type="button" class="filter-chip active" data-filter="all"></button>
            <button type="button" class="filter-chip" data-filter="unanswered"></button>
            <button type="button" class="filter-chip" data-filter="replied"></button>
            <button type="button" class="filter-chip" data-filter="reported"></button>
            <button type="button" class="filter-chip" data-filter="blocked"></button>
          </div>
          <div id="author-missives-list"></div>
        </div>

        <!-- Reader Missives View -->
        <div id="reader-missives-view">
          <span id="inquire-author-display"></span>
          <span id="inquire-author-email-pill" class="hidden">
            <span id="inquire-author-email-target"></span>
          </span>
          <span id="success-author-target"></span>
          <span id="letter-author-name"></span>
          <p id="letter-author-bio"></p>
          <div id="letter-author-email-row" class="hidden">
            <span id="letter-author-email-display"></span>
          </div>
          <img id="letter-author-avatar" src="" alt="" />
          <a id="letter-author-profile-link" href="#"></a>
          <a id="letter-author-email-btn" class="hidden" href="#"></a>
          <button id="letter-shelf-quick-btn"></button>

          <form id="chronicler-inquire-form">
            <div id="inquiry-category-chips">
              <button type="button" class="inquiry-category-chip active" data-category="lore" aria-checked="true"></button>
              <button type="button" class="inquiry-category-chip" data-category="characters" aria-checked="false"></button>
              <button type="button" class="inquiry-category-chip" data-category="plot" aria-checked="false"></button>
              <button type="button" class="inquiry-category-chip" data-category="connect" aria-checked="false"></button>
            </div>
            <input type="hidden" id="inquire-category" value="lore" />

            <input type="text" id="inquire-sender-name" value="" />
            <input type="text" id="inquire-sender-contact" value="" />
            <textarea id="inquire-message"></textarea>
            <span id="inquire-char-counter">0 / 800</span>
            <p id="inquire-form-error" class="hidden"></p>

            <button type="submit" id="inquire-submit-btn">
              <span id="inquire-submit-text">Dispatch Missive</span>
            </button>
          </form>

          <div id="chronicler-inquire-success" class="hidden">
            <button id="btn-inquire-another" type="button"></button>
          </div>

          <div id="reader-sent-inquiries-container">
            <span id="reader-sent-count-badge">0 Dispatched</span>
            <div id="reader-sent-inquiries-list"></div>
          </div>
        </div>

      </div>
      <button id="shelf-btn-desktop" type="button"></button>
    `;
  });

  /* ─────────────────────────────────────────────
     Reader View Tests
     ───────────────────────────────────────────── */

  it('hydrates author profile details, bio, and avatar correctly', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    expect(document.getElementById('inquire-author-display').textContent).toBe('Master Chronicler');
    expect(document.getElementById('success-author-target').textContent).toBe('Master Chronicler');
    expect(document.getElementById('letter-author-name').textContent).toBe('Master Chronicler');
    expect(document.getElementById('letter-author-bio').textContent).toBe(
      'Keeper of ancient memories.'
    );
    expect(document.getElementById('letter-author-avatar').src).toBe(
      'https://example.com/avatar.png'
    );
    expect(document.getElementById('letter-author-profile-link').getAttribute('href')).toBe(
      '/profile.html?uid=author-789'
    );
  });

  it('updates author correspondence email UI from author status promise', async () => {
    setupInquire('tale-001', mockTale, 'user-456');

    await vi.waitFor(() => {
      expect(document.getElementById('letter-author-email-display').textContent).toBe(
        'author@chronicles.com'
      );
      expect(document.getElementById('inquire-author-email-target').textContent).toBe(
        'author@chronicles.com'
      );
    });

    expect(document.getElementById('letter-author-email-row').classList.contains('hidden')).toBe(
      false
    );
    expect(document.getElementById('inquire-author-email-pill').classList.contains('hidden')).toBe(
      false
    );
    expect(document.getElementById('letter-author-email-btn').getAttribute('href')).toContain(
      'mailto:author%40chronicles.com'
    );
  });

  it('pre-fills reader moniker and contact from auth user details', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    expect(document.getElementById('inquire-sender-name').value).toBe('Valiant Reader');
    expect(document.getElementById('inquire-sender-contact').value).toBe('reader@test.com');
  });

  it('switches category chips on click', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const chips = document.querySelectorAll('.inquiry-category-chip');
    const plotChip = chips[2];
    plotChip.click();

    expect(document.getElementById('inquire-category').value).toBe('plot');
    expect(plotChip.classList.contains('active')).toBe(true);
    expect(chips[0].classList.contains('active')).toBe(false);
  });

  it('updates char counter and removes error state on input', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const textarea = document.getElementById('inquire-message');
    const counter = document.getElementById('inquire-char-counter');
    const error = document.getElementById('inquire-form-error');

    error.classList.remove('hidden');
    error.textContent = 'Some error';

    textarea.value = 'What is the secret of the void?';
    textarea.dispatchEvent(new Event('input'));

    expect(counter.textContent).toBe('31 / 800');
    expect(error.classList.contains('hidden')).toBe(true);
  });

  it('validates minimum message length on submission', async () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const form = document.getElementById('chronicler-inquire-form');
    const textarea = document.getElementById('inquire-message');
    const error = document.getElementById('inquire-form-error');

    textarea.value = 'Too short';
    form.dispatchEvent(new Event('submit'));

    expect(error.classList.contains('hidden')).toBe(false);
    expect(error.textContent).toContain('at least 10 characters long');
  });

  it('dispatches inquiry successfully and persists to local storage', async () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const form = document.getElementById('chronicler-inquire-form');
    const nameInput = document.getElementById('inquire-sender-name');
    const textarea = document.getElementById('inquire-message');
    const success = document.getElementById('chronicler-inquire-success');

    nameInput.value = 'Archivist Ronin';
    textarea.value = 'Where was the citadel of the void located in the first era?';

    form.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(toast.showToast).toHaveBeenCalledWith(
        expect.stringContaining('dispatched'),
        'success'
      );
    });
    expect(form.classList.contains('hidden')).toBe(true);
    expect(success.classList.contains('hidden')).toBe(false);

    const stored = getStoredInquiries('tale-001');
    expect(stored.length).toBe(1);
    expect(stored[0].senderMoniker).toBe('Archivist Ronin');
    expect(stored[0].message).toContain('Where was the citadel');
    expect(stored[0].status).toBe('sent');
  });

  it('blocks dispatch when reader moniker is in blocked list', async () => {
    saveBlockedSender('tale-001', 'Blocked Troll');
    setupInquire('tale-001', mockTale, 'user-456');

    const form = document.getElementById('chronicler-inquire-form');
    const nameInput = document.getElementById('inquire-sender-name');
    const textarea = document.getElementById('inquire-message');
    const error = document.getElementById('inquire-form-error');

    nameInput.value = 'Blocked Troll';
    textarea.value = 'Trying to spam this author chronicle...';

    form.dispatchEvent(new Event('submit'));

    expect(error.classList.contains('hidden')).toBe(false);
    expect(error.textContent).toContain('blocked');
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringContaining('blocked'), 'error');
  });

  it('resets form state when inscribe another button is clicked', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const form = document.getElementById('chronicler-inquire-form');
    const success = document.getElementById('chronicler-inquire-success');
    const textarea = document.getElementById('inquire-message');

    form.classList.add('hidden');
    success.classList.remove('hidden');
    textarea.value = 'Previous message';

    const resetBtn = document.getElementById('btn-inquire-another');
    resetBtn.click();

    expect(textarea.value).toBe('');
    expect(document.getElementById('inquire-char-counter').textContent).toBe('0 / 800');
    expect(form.classList.contains('hidden')).toBe(false);
    expect(success.classList.contains('hidden')).toBe(true);
  });

  it('renders sent inquiries and author replies for the reader', () => {
    saveStoredInquiries('tale-001', [
      {
        id: 'inq-1',
        taleId: 'tale-001',
        userId: 'user-456',
        senderMoniker: 'Valiant Reader',
        category: 'lore',
        message: 'Is the Citadel still standing?',
        status: 'replied',
        replyText: 'It fell in the Second Era, but its archives survive.',
        replyAuthorName: 'Master Chronicler',
        createdAt: new Date().toISOString(),
      },
    ]);

    setupInquire('tale-001', mockTale, 'user-456');

    const sentList = document.getElementById('reader-sent-inquiries-list');
    expect(sentList.innerHTML).toContain('Is the Citadel still standing?');
    expect(sentList.innerHTML).toContain('It fell in the Second Era');
    expect(sentList.innerHTML).toContain('Response Received');
    expect(document.getElementById('reader-sent-count-badge').textContent).toContain(
      '1 Dispatched'
    );
  });

  /* ─────────────────────────────────────────────
     Author View Tests
     ───────────────────────────────────────────── */

  it('activates Author Mailroom view when current user is the author', () => {
    setupInquire('tale-001', mockTale, 'author-789');

    expect(document.getElementById('tab-btn-letter').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('author-missives-view').classList.contains('hidden')).toBe(
      false
    );
    expect(document.getElementById('reader-missives-view').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('.chronicler-invite-card').classList.contains('hidden')).toBe(
      false
    );
  });

  it('renders author stats and missives list with pending, replied, and total', () => {
    saveStoredInquiries('tale-001', [
      {
        id: 'inq-a1',
        taleId: 'tale-001',
        senderMoniker: 'Reader Alice',
        category: 'lore',
        message: 'Tell me about the Void.',
        status: 'sent',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'inq-a2',
        taleId: 'tale-001',
        senderMoniker: 'Reader Bob',
        category: 'plot',
        message: 'Who was the traitor?',
        status: 'replied',
        replyText: 'Read Chapter 4 carefully.',
        replyAuthorName: 'Master Chronicler',
        createdAt: new Date().toISOString(),
      },
    ]);

    setupInquire('tale-001', mockTale, 'author-789');

    expect(document.getElementById('author-stat-total').textContent).toBe('2');
    expect(document.getElementById('author-stat-pending').textContent).toBe('1');
    expect(document.getElementById('author-stat-replied').textContent).toBe('1');

    const list = document.getElementById('author-missives-list');
    expect(list.innerHTML).toContain('Reader Alice');
    expect(list.innerHTML).toContain('Reader Bob');
    expect(list.innerHTML).toContain('Tell me about the Void.');
  });

  it('allows author to reply to a missive', async () => {
    saveStoredInquiries('tale-001', [
      {
        id: 'inq-reply-test',
        taleId: 'tale-001',
        senderMoniker: 'Curious Seeker',
        category: 'lore',
        message: 'What happens to the fallen stars?',
        status: 'sent',
        createdAt: new Date().toISOString(),
      },
    ]);

    setupInquire('tale-001', mockTale, 'author-789');

    await replyToMissive(
      'tale-001',
      'inq-reply-test',
      'They become dormant runes.',
      'Master Chronicler'
    );

    const updated = getStoredInquiries('tale-001');
    expect(updated[0].status).toBe('replied');
    expect(updated[0].replyText).toBe('They become dormant runes.');
    expect(updated[0].replyAuthorName).toBe('Master Chronicler');
  });

  it('allows author to report a missive', async () => {
    saveStoredInquiries('tale-001', [
      {
        id: 'inq-report-test',
        taleId: 'tale-001',
        senderMoniker: 'Spammer',
        message: 'Inappropriate content',
        status: 'sent',
        createdAt: new Date().toISOString(),
      },
    ]);

    await reportMissive('tale-001', 'inq-report-test');

    const updated = getStoredInquiries('tale-001');
    expect(updated[0].status).toBe('reported');
    expect(updated[0].isReported).toBe(true);
  });

  it('allows author to block a sender', async () => {
    saveStoredInquiries('tale-001', [
      {
        id: 'inq-block-test',
        taleId: 'tale-001',
        senderMoniker: 'Hostile Reader',
        senderId: 'hostile-uid-1',
        message: 'Hostile message',
        status: 'sent',
        createdAt: new Date().toISOString(),
      },
    ]);

    await blockSender('tale-001', 'inq-block-test', 'Hostile Reader', 'hostile-uid-1');

    const updated = getStoredInquiries('tale-001');
    expect(updated[0].status).toBe('blocked');
    expect(updated[0].isBlocked).toBe(true);

    const blockedSet = getBlockedSenders('tale-001');
    expect(blockedSet.has('hostile reader')).toBe(true);
    expect(blockedSet.has('hostile-uid-1')).toBe(true);
  });
});
