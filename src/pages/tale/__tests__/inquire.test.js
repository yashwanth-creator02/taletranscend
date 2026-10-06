// src/pages/tale/__tests__/inquire.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupInquire } from '../inquire.js';
import * as toast from '@ui/components/toast.js';

vi.mock('@fb/index.js', () => ({
  auth: {
    currentUser: { uid: 'user-456', displayName: 'Valiant Reader', email: 'reader@test.com' },
  },
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@ui/components/icons.js', () => ({
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

describe("The Chronicler's Letter Inquire System", () => {
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
      <div id="content-letter" class="tab-content hidden">
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
      </div>
      <button id="shelf-btn-desktop" type="button"></button>
    `;
  });

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

  it('hydrates author correspondence email and mailto link if present', () => {
    mockTale.authorEmail = 'author@chronicles.com';
    setupInquire('tale-001', mockTale, 'user-456');

    expect(document.getElementById('inquire-author-email-target').textContent).toBe(
      'author@chronicles.com'
    );
    expect(document.getElementById('inquire-author-email-pill').classList.contains('hidden')).toBe(
      false
    );
    expect(document.getElementById('letter-author-email-display').textContent).toBe(
      'author@chronicles.com'
    );
    expect(document.getElementById('letter-author-email-row').classList.contains('hidden')).toBe(
      false
    );
    expect(document.getElementById('letter-author-email-btn').getAttribute('href')).toContain(
      'mailto:author%40chronicles.com'
    );
  });

  it('pre-fills reader moniker and contact from auth', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    expect(document.getElementById('inquire-sender-name').value).toBe('Valiant Reader');
    expect(document.getElementById('inquire-sender-contact').value).toBe('reader@test.com');
  });

  it('switches inquiry category when chips are clicked', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const chips = document.querySelectorAll('.inquiry-category-chip');
    const plotChip = chips[2]; // plot

    plotChip.click();

    expect(document.getElementById('inquire-category').value).toBe('plot');
    expect(plotChip.classList.contains('active')).toBe(true);
    expect(plotChip.getAttribute('aria-checked')).toBe('true');
    expect(chips[0].classList.contains('active')).toBe(false);
    expect(chips[0].getAttribute('aria-checked')).toBe('false');
  });

  it('updates live character counter as user types', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const textarea = document.getElementById('inquire-message');
    textarea.value = 'What is the secret of the monolith?';
    textarea.dispatchEvent(new Event('input'));

    expect(document.getElementById('inquire-char-counter').textContent).toBe('35 / 800');
  });

  it('shows error if moniker is too short on submit', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    document.getElementById('inquire-sender-name').value = 'A';
    document.getElementById('inquire-message').value = 'Tell me about the ancient lore.';

    const form = document.getElementById('chronicler-inquire-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errorEl = document.getElementById('inquire-form-error');
    expect(errorEl.classList.contains('hidden')).toBe(false);
    expect(errorEl.textContent).toContain('at least 2 characters');
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it('shows error if message is too short on submit', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    document.getElementById('inquire-sender-name').value = 'Seeker';
    document.getElementById('inquire-message').value = 'Short';

    const form = document.getElementById('chronicler-inquire-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errorEl = document.getElementById('inquire-form-error');
    expect(errorEl.classList.contains('hidden')).toBe(false);
    expect(errorEl.textContent).toContain('at least 10 characters');
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it('successfully dispatches missive and transitions to success view', () => {
    mockTale.authorEmail = 'author@chronicles.com';
    setupInquire('tale-001', mockTale, 'user-456');

    document.getElementById('inquire-sender-name').value = 'Wayfarer';
    document.getElementById('inquire-sender-contact').value = 'wayfarer@domain.com';
    document.getElementById('inquire-message').value =
      'How did the celestial guardian forge the key?';

    const form = document.getElementById('chronicler-inquire-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(toast.showToast).toHaveBeenCalledWith(
      'Your missive has been dispatched to the scribe!',
      'success'
    );
    expect(form.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('chronicler-inquire-success').classList.contains('hidden')).toBe(
      false
    );

    // Verify stored in localStorage
    expect(localStorage.getItem('tt_reader_moniker')).toBe('Wayfarer');
    const stored = JSON.parse(localStorage.getItem('tt_inquiries_tale-001'));
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe('How did the celestial guardian forge the key?');
    expect(stored[0].authorName).toBe('Master Chronicler');
    expect(stored[0].authorEmail).toBe('author@chronicles.com');
  });

  it('enforces cooldown if submitted too rapidly', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    document.getElementById('inquire-sender-name').value = 'Wayfarer';
    document.getElementById('inquire-message').value = 'First missive query long enough.';

    const form = document.getElementById('chronicler-inquire-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Immediately trigger second submit
    document.getElementById('inquire-message').value = 'Second missive immediately after.';
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(toast.showToast).toHaveBeenCalledWith(
      'Please wait a moment before dispatching another missive.',
      'info'
    );
  });

  it('resets form when Inscribe Another Missive is clicked', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const form = document.getElementById('chronicler-inquire-form');
    const success = document.getElementById('chronicler-inquire-success');
    const textarea = document.getElementById('inquire-message');

    // Simulate after success
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

  it('opens letter tab and scrolls when synopsis teaser button is clicked', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const tabBtn = document.getElementById('tab-btn-letter');
    const tabClickSpy = vi.fn();
    tabBtn.addEventListener('click', tabClickSpy);

    const teaserBtn = document.getElementById('btn-open-chronicler-letter');
    teaserBtn.click();

    expect(tabClickSpy).toHaveBeenCalled();
  });

  it('triggers bookmark shelf click when quick bookmark button is clicked', () => {
    setupInquire('tale-001', mockTale, 'user-456');

    const shelfBtn = document.getElementById('shelf-btn-desktop');
    const shelfClickSpy = vi.fn();
    shelfBtn.addEventListener('click', shelfClickSpy);

    const quickBtn = document.getElementById('letter-shelf-quick-btn');
    quickBtn.click();

    expect(shelfClickSpy).toHaveBeenCalled();
  });
});
