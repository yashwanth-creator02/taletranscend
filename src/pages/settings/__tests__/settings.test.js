// src/pages/settings/__tests__/settings.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SETTINGS_DEFAULTS,
  getSavedSettings,
  saveSetting,
  updatePreview,
  renderThemes,
  renderFonts,
  getArchivalStats,
  initSettingsInteractions,
  setupAuthDisplay,
  handleNavigateBack,
  initSettingsBackButton,
  normalizeSectionId,
  switchSettingsSection,
  initSettingsSidebar,
  initSettingsSearch,
  renderProfileGenres,
  getSelectedGenres,
  setSelectedGenres,
  updateAvatarPreview,
  handleSaveProfile,
  initProfileSettings,
  renderAppThemes,
  updateActiveAppThemeBadge,
  updateBioCharCount,
  updateGeminiKeyBadge,
  initGeminiKeyModal,
} from '../settings.js';
import {
  READER_STORAGE_KEYS,
  APP_THEMES,
  DEFAULT_APP_THEME,
  APP_THEME_STORAGE_KEY,
  getSavedAppTheme,
  applyAppTheme,
  initAppTheme,
} from '@config/theme.config.js';
import { auth, onAuthStateChanged, setDoc, getDoc } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { getStoredApiKey } from '@/services/ai/apiKey.storage.js';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: null },
  onAuthStateChanged: vi.fn(),
  refs: { user: vi.fn((uid) => ({ id: uid })) },
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

vi.mock('@ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    initPageReveal: vi.fn(),
    readyReveal: vi.fn(),
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    })),
    escapeHtml: vi.fn((str) => str || ''),
  };
});

vi.mock('@config/theme.config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadReaderFontStylesheets: vi.fn(),
  };
});

vi.mock('@pages/profile/ai-name.js', () => ({
  suggestNameFromBio: vi.fn(() => Promise.resolve('Mythic Oracle')),
}));

vi.mock('@/services/ai/apiKey.storage.js', () => ({
  getStoredApiKey: vi.fn(() => 'AIzaSyMockKey'),
  setStoredApiKey: vi.fn(),
  clearStoredApiKey: vi.fn(),
}));

describe('Settings Page Controller', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getSavedSettings & saveSetting', () => {
    it('returns default settings when storage is empty', () => {
      const settings = getSavedSettings();
      expect(settings.theme).toBe(SETTINGS_DEFAULTS.theme);
      expect(settings.fontFamily).toBe(SETTINGS_DEFAULTS.fontFamily);
      expect(settings.fontSize).toBe(SETTINGS_DEFAULTS.fontSize);
      expect(settings.lineHeight).toBe(SETTINGS_DEFAULTS.lineHeight);
      expect(settings.measure).toBe(SETTINGS_DEFAULTS.measure);
      expect(settings.particles).toBe(true);
      expect(settings.audio).toBe(true);
      expect(settings.reducedMotion).toBe(false);
      expect(settings.moniker).toBe('');
    });

    it('reads custom values from localStorage', () => {
      localStorage.setItem(READER_STORAGE_KEYS.theme, 'parchment');
      localStorage.setItem(READER_STORAGE_KEYS.fontFamily, 'Cinzel');
      localStorage.setItem(READER_STORAGE_KEYS.fontSize, '22');
      localStorage.setItem(READER_STORAGE_KEYS.lineHeight, '1.8');
      localStorage.setItem(READER_STORAGE_KEYS.measure, '75');
      localStorage.setItem('tt_settings_particles', 'false');
      localStorage.setItem('tt_settings_audio', 'false');
      localStorage.setItem('tt_settings_reduced_motion', 'true');
      localStorage.setItem('tt_reader_moniker', 'Chronicler Leo');

      const settings = getSavedSettings();
      expect(settings.theme).toBe('parchment');
      expect(settings.fontFamily).toBe('Cinzel');
      expect(settings.fontSize).toBe(22);
      expect(settings.lineHeight).toBe(1.8);
      expect(settings.measure).toBe(75);
      expect(settings.particles).toBe(false);
      expect(settings.audio).toBe(false);
      expect(settings.reducedMotion).toBe(true);
      expect(settings.moniker).toBe('Chronicler Leo');
    });

    it('saves key/value to localStorage correctly', () => {
      saveSetting(READER_STORAGE_KEYS.theme, 'crimson');
      expect(localStorage.getItem(READER_STORAGE_KEYS.theme)).toBe('crimson');
    });
  });

  describe('normalizeSectionId', () => {
    it('normalizes various input formats to section-* convention', () => {
      expect(normalizeSectionId('profile')).toBe('section-profile');
      expect(normalizeSectionId('#profile')).toBe('section-profile');
      expect(normalizeSectionId('section-profile')).toBe('section-profile');
      expect(normalizeSectionId('themes')).toBe('section-themes');
      expect(normalizeSectionId('#themes')).toBe('section-themes');
      expect(normalizeSectionId('')).toBe('section-profile');
      expect(normalizeSectionId(null)).toBe('section-profile');
    });
  });

  describe('switchSettingsSection', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button class="settings-nav-item active" data-target="section-profile" aria-selected="true">Profile</button>
        <button class="settings-nav-item" data-target="section-themes" aria-selected="false">Themes</button>
        <button class="settings-nav-item" data-target="section-typography" aria-selected="false">Typography</button>
        <section id="section-profile" class="settings-section"></section>
        <section id="section-themes" class="settings-section hidden"></section>
        <section id="section-typography" class="settings-section hidden"></section>
      `;
    });

    it('displays target section and hides all other sections', () => {
      switchSettingsSection('section-themes', false);

      const profileSection = document.getElementById('section-profile');
      const themesSection = document.getElementById('section-themes');
      const typographySection = document.getElementById('section-typography');

      expect(profileSection.classList.contains('hidden')).toBe(true);
      expect(themesSection.classList.contains('hidden')).toBe(false);
      expect(typographySection.classList.contains('hidden')).toBe(true);

      const navItems = document.querySelectorAll('.settings-nav-item');
      expect(navItems[0].classList.contains('active')).toBe(false);
      expect(navItems[1].classList.contains('active')).toBe(true);
      expect(navItems[1].getAttribute('aria-selected')).toBe('true');
    });

    it('aliases legacy section targets to new unified sections when legacy sections do not exist', () => {
      document.body.innerHTML = `
        <button class="settings-nav-item active" data-target="section-profile" aria-selected="true">Profile</button>
        <button class="settings-nav-item" data-target="section-general" aria-selected="false">General</button>
        <button class="settings-nav-item" data-target="section-reader" aria-selected="false">Reader</button>
        <section id="section-profile" class="settings-section"></section>
        <section id="section-general" class="settings-section hidden"></section>
        <section id="section-reader" class="settings-section hidden"></section>
      `;

      switchSettingsSection('section-themes', false);
      expect(document.getElementById('section-general').classList.contains('hidden')).toBe(false);

      switchSettingsSection('section-typography', false);
      expect(document.getElementById('section-reader').classList.contains('hidden')).toBe(false);
    });
  });

  describe('updatePreview', () => {
    it('applies styles and theme attributes to preview DOM elements', () => {
      document.body.innerHTML = `
        <div id="settings-preview-box">
          <p id="settings-preview-text">Sample reading text</p>
        </div>
      `;

      const settings = {
        theme: 'emerald',
        fontFamily: 'literary',
        fontSize: 20,
        lineHeight: 1.7,
        measure: 65,
      };

      updatePreview(settings);

      const previewBox = document.getElementById('settings-preview-box');
      const previewText = document.getElementById('settings-preview-text');

      expect(previewBox.getAttribute('data-reader-theme')).toBe('emerald');
      expect(previewText.style.fontFamily).toContain('Merriweather');
      expect(previewText.style.fontSize).toBe('20px');
      expect(previewText.style.lineHeight).toBe('1.7');
      expect(previewBox.style.maxWidth).toBe('65ch');
    });
  });

  describe('renderThemes', () => {
    it('renders theme cards with the active theme selected', () => {
      document.body.innerHTML = '<div id="settings-theme-grid"></div>';
      renderThemes('sepia');

      const grid = document.getElementById('settings-theme-grid');
      const activeCard = grid.querySelector('.theme-option-card.active');
      expect(activeCard).toBeTruthy();
      expect(activeCard.getAttribute('data-theme')).toBe('sepia');
      expect(activeCard.getAttribute('aria-checked')).toBe('true');
    });

    it('renders distinct manuscript specimens with genuine ink styling and no light/dark mode tags', () => {
      document.body.innerHTML = '<div id="settings-theme-grid"></div>';
      renderThemes('transcendental');

      const grid = document.getElementById('settings-theme-grid');
      const cards = grid.querySelectorAll('.theme-option-card');
      expect(cards.length).toBe(12);

      const sepiaCard = grid.querySelector('[data-theme="sepia"]');
      expect(sepiaCard).toBeTruthy();
      expect(sepiaCard.querySelector('.theme-specimen')).toBeTruthy();
      expect(sepiaCard.querySelector('.theme-specimen__glyph').textContent).toBe('Aa');
      expect(sepiaCard.querySelector('.theme-specimen__badge')).toBeNull();
      expect(sepiaCard.querySelector('.theme-option-card__mode-tag')).toBeNull();

      const noirCard = grid.querySelector('[data-theme="noir"]');
      expect(noirCard).toBeTruthy();
      expect(noirCard.querySelector('.theme-specimen__badge')).toBeNull();
      expect(noirCard.querySelector('.theme-option-card__mode-tag')).toBeNull();
    });
  });

  describe('renderFonts', () => {
    it('renders available font chips with accessible contrast classes', () => {
      document.body.innerHTML = '<div id="settings-font-list"></div>';
      renderFonts('serif');

      const list = document.getElementById('settings-font-list');
      const chips = list.querySelectorAll('.settings-font-chip');
      expect(chips.length).toBeGreaterThan(0);

      const activeChip = list.querySelector('.settings-font-chip.active');
      expect(activeChip).toBeTruthy();
      expect(activeChip.getAttribute('data-font')).toBe('serif');

      const title = activeChip.querySelector('.settings-font-chip__title');
      const sub = activeChip.querySelector('.settings-font-chip__sub');
      expect(title).toBeTruthy();
      expect(sub).toBeTruthy();
    });
  });

  describe('updateBioCharCount', () => {
    it('updates character count display correctly', () => {
      document.body.innerHTML = '<span id="bio-char-count">0 / 1000</span>';
      updateBioCharCount(142);
      expect(document.getElementById('bio-char-count').textContent).toBe('142 / 1000');
    });
  });

  describe('updateGeminiKeyBadge', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <span id="gemini-key-status" class="settings-status-badge settings-status-badge--inactive">
          <span id="gemini-key-status-text">Not Configured</span>
        </span>
        <button id="btn-open-gemini-key-modal">
          <span id="btn-open-gemini-text">Configure Key</span>
        </button>
        <input type="password" id="input-gemini-key" value="" />
      `;
    });

    it('sets active status when a key is present', () => {
      getStoredApiKey.mockReturnValue('AIzaSy123456');
      const input = document.getElementById('input-gemini-key');
      input.value = 'AIzaSy123456';

      updateGeminiKeyBadge();

      const badge = document.getElementById('gemini-key-status');
      expect(badge.classList.contains('settings-status-badge--active')).toBe(true);
      expect(badge.classList.contains('settings-status-badge--inactive')).toBe(false);
      expect(document.getElementById('gemini-key-status-text').textContent).toBe('Key Configured');
      expect(document.getElementById('btn-open-gemini-text').textContent).toBe('Manage Key');
    });

    it('sets inactive status when no key is present', () => {
      getStoredApiKey.mockReturnValue('');
      const input = document.getElementById('input-gemini-key');
      input.value = '';

      updateGeminiKeyBadge();

      const badge = document.getElementById('gemini-key-status');
      expect(badge.classList.contains('settings-status-badge--inactive')).toBe(true);
      expect(document.getElementById('gemini-key-status-text').textContent).toBe('Not Configured');
      expect(document.getElementById('btn-open-gemini-text').textContent).toBe('Configure Key');
    });
  });

  describe('initGeminiKeyModal', () => {
    beforeEach(() => {
      getStoredApiKey.mockReturnValue('');
      document.body.innerHTML = `
        <span id="gemini-key-status" class="settings-status-badge settings-status-badge--inactive">
          <span id="gemini-key-status-text">Not Configured</span>
        </span>
        <button id="btn-open-gemini-key-modal">
          <span id="btn-open-gemini-text">Configure Key</span>
        </button>
        <input type="password" id="input-gemini-key" value="" />
        <div id="modal-gemini-key" class="settings-modal-overlay hidden" aria-hidden="true">
          <div id="modal-gemini-backdrop"></div>
          <button id="modal-gemini-close"></button>
          <input type="password" id="input-gemini-key-modal" />
          <button id="btn-toggle-modal-key">Show</button>
          <button id="btn-clear-modal-key">Remove</button>
          <button id="btn-cancel-modal-key">Cancel</button>
          <button id="btn-save-modal-key">Save</button>
        </div>
      `;
    });

    it('opens modal and loads key on button click', () => {
      getStoredApiKey.mockReturnValue('AIzaSyTestKey');
      document.getElementById('input-gemini-key').value = 'AIzaSyTestKey';
      initGeminiKeyModal();

      const openBtn = document.getElementById('btn-open-gemini-key-modal');
      const modal = document.getElementById('modal-gemini-key');
      const modalInput = document.getElementById('input-gemini-key-modal');

      openBtn.click();

      expect(modal.classList.contains('hidden')).toBe(false);
      expect(modal.getAttribute('aria-hidden')).toBe('false');
      expect(modalInput.value).toBe('AIzaSyTestKey');
    });

    it('closes modal on cancel button and close button click', () => {
      initGeminiKeyModal();

      const openBtn = document.getElementById('btn-open-gemini-key-modal');
      const closeBtn = document.getElementById('modal-gemini-close');
      const cancelBtn = document.getElementById('btn-cancel-modal-key');
      const modal = document.getElementById('modal-gemini-key');

      openBtn.click();
      expect(modal.classList.contains('hidden')).toBe(false);

      closeBtn.click();
      expect(modal.classList.contains('hidden')).toBe(true);

      openBtn.click();
      expect(modal.classList.contains('hidden')).toBe(false);

      cancelBtn.click();
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('toggles password visibility in modal', () => {
      initGeminiKeyModal();

      const toggleBtn = document.getElementById('btn-toggle-modal-key');
      const modalInput = document.getElementById('input-gemini-key-modal');

      expect(modalInput.type).toBe('password');
      toggleBtn.click();
      expect(modalInput.type).toBe('text');
      expect(toggleBtn.textContent).toBe('Hide');

      toggleBtn.click();
      expect(modalInput.type).toBe('password');
      expect(toggleBtn.textContent).toBe('Show');
    });

    it('saves key and updates status badge on save click', () => {
      initGeminiKeyModal();

      const openBtn = document.getElementById('btn-open-gemini-key-modal');
      const modalInput = document.getElementById('input-gemini-key-modal');
      const saveBtn = document.getElementById('btn-save-modal-key');
      const modal = document.getElementById('modal-gemini-key');

      openBtn.click();
      modalInput.value = 'AIzaSyNewSavedKey';
      saveBtn.click();

      expect(modal.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('input-gemini-key').value).toBe('AIzaSyNewSavedKey');
      expect(showToast).toHaveBeenCalledWith(
        'Gemini API key stored securely in local storage.',
        'success'
      );
    });

    it('clears key on remove button click', () => {
      document.getElementById('input-gemini-key').value = 'AIzaSyExistingKey';
      initGeminiKeyModal();

      const openBtn = document.getElementById('btn-open-gemini-key-modal');
      const clearBtn = document.getElementById('btn-clear-modal-key');
      const modal = document.getElementById('modal-gemini-key');

      openBtn.click();
      clearBtn.click();

      expect(modal.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('input-gemini-key').value).toBe('');
      expect(showToast).toHaveBeenCalledWith('Gemini API key removed.', 'info');
    });
  });

  describe('renderFonts', () => {
    it('renders font chips with active state and checkmark', () => {
      document.body.innerHTML = '<div id="settings-font-list"></div>';
      renderFonts('sans');

      const list = document.getElementById('settings-font-list');
      const activeChip = list.querySelector('.settings-font-chip.active');
      expect(activeChip).toBeTruthy();
      expect(activeChip.getAttribute('data-font')).toBe('sans');

      const checkIcon = activeChip.querySelector('.font-check');
      expect(checkIcon.classList.contains('hidden')).toBe(false);
    });
  });

  describe('renderProfileGenres & selection', () => {
    it('renders genre chips with active state for selected genres', () => {
      document.body.innerHTML = '<div id="genre-selector"></div>';
      renderProfileGenres(['Folklore', 'Fantasy']);

      const chips = document.querySelectorAll('.genre-chip');
      expect(chips.length).toBeGreaterThan(0);

      const activeChips = document.querySelectorAll('.genre-chip.active');
      expect(activeChips.length).toBe(2);
      expect(getSelectedGenres()).toEqual(['Folklore', 'Fantasy']);
    });

    it('allows updating selected genres through setSelectedGenres', () => {
      setSelectedGenres(['Mythology']);
      expect(getSelectedGenres()).toEqual(['Mythology']);
    });
  });

  describe('updateAvatarPreview', () => {
    it('shows image and hides fallback icon when valid url provided', () => {
      document.body.innerHTML = `
        <img id="modal-avatar-preview" class="hidden" src="" />
        <i id="modal-avatar-fallback"></i>
      `;

      updateAvatarPreview('https://example.com/avatar.jpg');

      const img = document.getElementById('modal-avatar-preview');
      const fallback = document.getElementById('modal-avatar-fallback');

      expect(img.classList.contains('hidden')).toBe(false);
      expect(fallback.classList.contains('hidden')).toBe(true);
      expect(img.src).toBe('https://example.com/avatar.jpg');
    });

    it('hides image and shows fallback icon when url is empty', () => {
      document.body.innerHTML = `
        <img id="modal-avatar-preview" src="https://example.com/avatar.jpg" />
        <i id="modal-avatar-fallback" class="hidden"></i>
      `;

      updateAvatarPreview('');

      const img = document.getElementById('modal-avatar-preview');
      const fallback = document.getElementById('modal-avatar-fallback');

      expect(img.classList.contains('hidden')).toBe(true);
      expect(fallback.classList.contains('hidden')).toBe(false);
    });
  });

  describe('handleSaveProfile', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="input-name" value="Archivist Ronin" />
        <textarea id="input-bio">Chronicler of tales</textarea>
        <input id="input-pronouns" value="they/them" />
        <input id="input-avatar-url" value="https://example.com/pic.png" />
        <input id="input-location" value="Kyoto" />
        <input id="input-website" value="https://example.com" />
        <input id="input-twitter" value="ronin" />
        <input id="input-instagram" value="ronin_scribe" />
        <input id="input-reading-goal" value="24" />
        <input id="input-gemini-key" value="AIzaSyTest" />
        <button id="btn-save-profile">Save</button>
      `;
      setSelectedGenres(['Folklore']);
    });

    it('alerts error if user is not authenticated', async () => {
      auth.currentUser = null;
      const result = await handleSaveProfile();
      expect(result).toBe(false);
      expect(showToast).toHaveBeenCalledWith(
        'Please sign in or initialize anonymous auth before saving profile.',
        'error'
      );
    });

    it('validates schema and rejects invalid URLs', async () => {
      auth.currentUser = { uid: 'user-789' };
      document.getElementById('input-website').value = 'not-a-valid-url';

      const result = await handleSaveProfile();
      expect(result).toBe(false);
      expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('successfully commits validated profile data to Firestore', async () => {
      auth.currentUser = { uid: 'user-789' };
      getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });

      const result = await handleSaveProfile();
      expect(result).toBe(true);
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Archivist Ronin',
          bio: 'Chronicler of tales',
          readingGoal: 24,
          favouriteGenres: ['Folklore'],
        }),
        { merge: true }
      );
      expect(showToast).toHaveBeenCalledWith(
        'Chronicler profile saved to living archive.',
        'success'
      );
    });
  });

  describe('initProfileSettings', () => {
    it('toggles gemini api key input type when toggle button clicked', () => {
      document.body.innerHTML = `
        <input type="password" id="input-gemini-key" value="AIzaTest" />
        <button id="btn-toggle-gemini-key">Show</button>
      `;

      initProfileSettings();

      const input = document.getElementById('input-gemini-key');
      const toggleBtn = document.getElementById('btn-toggle-gemini-key');

      toggleBtn.click();
      expect(input.type).toBe('text');
      expect(toggleBtn.textContent).toBe('Hide');

      toggleBtn.click();
      expect(input.type).toBe('password');
      expect(toggleBtn.textContent).toBe('Show');
    });
  });

  describe('getArchivalStats', () => {
    it('accurately counts reading progress and inquiry cache keys', () => {
      localStorage.setItem('tt_progress_tale_1', JSON.stringify({ pct: 50 }));
      localStorage.setItem('tt_progress_tale_2', JSON.stringify({ pct: 80 }));
      localStorage.setItem('tt_inquiries_tale_1', JSON.stringify([]));
      localStorage.setItem('other_key', 'test');

      const stats = getArchivalStats();
      expect(stats.progressCount).toBe(3);
    });
  });

  describe('handleNavigateBack & initSettingsBackButton', () => {
    it('calls history.back() when referrer is from the same origin', () => {
      const originalReferrer = document.referrer;
      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

      Object.defineProperty(document, 'referrer', {
        value: `${window.location.origin}/library.html`,
        configurable: true,
      });
      Object.defineProperty(window.history, 'length', {
        value: 3,
        configurable: true,
      });

      handleNavigateBack();

      expect(historyBackSpy).toHaveBeenCalled();
      historyBackSpy.mockRestore();

      Object.defineProperty(document, 'referrer', {
        value: originalReferrer,
        configurable: true,
      });
    });

    it('falls back to /index.html when there is no referrer or external referrer', () => {
      delete window.location;
      window.location = { origin: 'http://localhost:3000', href: '', assign: vi.fn() };

      Object.defineProperty(document, 'referrer', {
        value: '',
        configurable: true,
      });
      Object.defineProperty(window.history, 'length', {
        value: 1,
        configurable: true,
      });

      handleNavigateBack();

      expect(window.location.assign).toHaveBeenCalledWith('/index.html');
    });

    it('navigates to /index.html when referrer is login page instead of calling history.back()', () => {
      delete window.location;
      window.location = { origin: 'http://localhost:3000', href: '', assign: vi.fn() };
      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

      Object.defineProperty(document, 'referrer', {
        value: `${window.location.origin}/login.html`,
        configurable: true,
      });
      Object.defineProperty(window.history, 'length', {
        value: 3,
        configurable: true,
      });

      handleNavigateBack();

      expect(historyBackSpy).not.toHaveBeenCalled();
      expect(window.location.assign).toHaveBeenCalledWith('/index.html');
      historyBackSpy.mockRestore();
    });

    it('attaches click listener to #settings-back-btn', () => {
      document.body.innerHTML = '<button id="settings-back-btn"></button>';
      delete window.location;
      window.location = { origin: 'http://localhost:3000', href: '', assign: vi.fn() };

      initSettingsBackButton();

      const backBtn = document.getElementById('settings-back-btn');
      backBtn.click();

      expect(window.location.assign).toHaveBeenCalledWith('/index.html');
    });
  });

  describe('initSettingsSidebar', () => {
    it('switches active state and scrolls to section when a nav item is clicked', () => {
      document.body.innerHTML = `
        <button class="settings-nav-item active" data-target="section-identity" aria-selected="true">Identity</button>
        <button class="settings-nav-item" data-target="section-themes" aria-selected="false">Themes</button>
        <div id="section-identity"></div>
        <div id="section-themes"></div>
      `;

      const targetEl = document.getElementById('section-themes');
      targetEl.scrollIntoView = vi.fn();

      initSettingsSidebar();

      const themesBtn = document.querySelectorAll('.settings-nav-item')[1];
      themesBtn.click();

      expect(themesBtn.classList.contains('active')).toBe(true);
      expect(themesBtn.getAttribute('aria-selected')).toBe('true');
      expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });

  describe('initSettingsSearch', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input type="search" id="settings-search-input" />
        <button id="settings-search-clear" class="hidden"></button>
        <div id="settings-no-results" class="hidden"></div>
        <section class="settings-section" data-section-name="Reader Identity">
          <div data-setting-item>Scribe Signature</div>
          <div data-setting-item>Account Identity</div>
        </section>
        <section class="settings-section" data-section-name="Atmosphere and Motion">
          <div data-setting-item>Starlight Particles</div>
          <div data-setting-item>Auditory Soundscapes</div>
        </section>
      `;
    });

    it('filters rows based on search input query', () => {
      initSettingsSearch();

      const searchInput = document.getElementById('settings-search-input');
      const clearBtn = document.getElementById('settings-search-clear');
      const sections = document.querySelectorAll('.settings-section');

      searchInput.value = 'particles';
      searchInput.dispatchEvent(new Event('input'));

      expect(clearBtn.classList.contains('hidden')).toBe(false);
      expect(sections[0].style.display).toBe('none');
      expect(sections[1].style.display).toBe('');

      const particlesRow = sections[1].querySelectorAll('[data-setting-item]')[0];
      const audioRow = sections[1].querySelectorAll('[data-setting-item]')[1];
      expect(particlesRow.style.display).toBe('');
      expect(audioRow.style.display).toBe('none');
    });

    it('resets search when clear button is clicked', () => {
      initSettingsSearch();

      const searchInput = document.getElementById('settings-search-input');
      const clearBtn = document.getElementById('settings-search-clear');

      searchInput.value = 'particles';
      searchInput.dispatchEvent(new Event('input'));

      clearBtn.click();

      expect(searchInput.value).toBe('');
      expect(clearBtn.classList.contains('hidden')).toBe(true);
      document.querySelectorAll('.settings-section').forEach((s) => {
        expect(s.style.display).toBe('');
      });
    });
  });

  describe('initSettingsInteractions', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="settings-back-btn"></button>
        <input type="search" id="settings-search-input" />
        <button id="settings-search-clear" class="hidden"></button>
        <div id="settings-no-results" class="hidden"></div>
        <button class="settings-nav-item active" data-target="section-identity">Identity</button>
        <div id="section-identity" class="settings-section">
          <div data-setting-item>Identity row</div>
        </div>
        <div id="settings-theme-grid"></div>
        <div id="settings-font-list"></div>
        <div id="settings-preview-box">
          <p id="settings-preview-text">Preview text</p>
        </div>
        <input type="range" id="setting-font-size" min="14" max="24" value="16" />
        <span id="setting-font-size-val">16px</span>
        <input type="range" id="setting-line-height" min="1.4" max="2.0" step="0.1" value="1.6" />
        <span id="setting-line-height-val">1.6</span>
        <button class="setting-measure-btn" data-measure="55">Compact</button>
        <button class="setting-measure-btn" data-measure="68">Comfortable</button>
        <button class="setting-measure-btn" data-measure="80">Expansive</button>
        <input type="checkbox" id="setting-particles" checked />
        <input type="checkbox" id="setting-audio" checked />
        <input type="checkbox" id="setting-reduced-motion" />
        <input type="text" id="setting-reader-moniker" />
        <span id="settings-cache-count">0 Cached Items</span>
        <button id="btn-clear-reading-cache">Clear Cache</button>
        <button id="btn-reset-settings">Reset Settings</button>
      `;
    });

    it('changes theme on card click', () => {
      initSettingsInteractions();

      const themeGrid = document.getElementById('settings-theme-grid');
      const midnightCard = themeGrid.querySelector('[data-theme="midnight"]');
      expect(midnightCard).toBeTruthy();

      midnightCard.click();

      expect(midnightCard.classList.contains('active')).toBe(true);
      expect(localStorage.getItem(READER_STORAGE_KEYS.theme)).toBe('midnight');
    });

    it('updates font size via slider', () => {
      initSettingsInteractions();

      const sizeSlider = document.getElementById('setting-font-size');
      sizeSlider.value = '22';
      sizeSlider.dispatchEvent(new Event('input'));

      expect(document.getElementById('setting-font-size-val').textContent).toBe('22px');
      expect(localStorage.getItem(READER_STORAGE_KEYS.fontSize)).toBe('22');
    });

    it('updates column measure on button click', () => {
      initSettingsInteractions();

      const btn80 = document.querySelector('[data-measure="80"]');
      btn80.click();

      expect(btn80.classList.contains('btn-primary')).toBe(true);
      expect(localStorage.getItem(READER_STORAGE_KEYS.measure)).toBe('80');
    });

    it('saves atmosphere toggles when changed', () => {
      initSettingsInteractions();

      const particlesToggle = document.getElementById('setting-particles');
      particlesToggle.checked = false;
      particlesToggle.dispatchEvent(new Event('change'));

      expect(localStorage.getItem('tt_settings_particles')).toBe('false');
    });

    it('clears cached items on clear cache button click', () => {
      localStorage.setItem('tt_progress_1', 'val');
      initSettingsInteractions();

      const clearBtn = document.getElementById('btn-clear-reading-cache');
      clearBtn.click();

      expect(localStorage.getItem('tt_progress_1')).toBeNull();
      expect(document.getElementById('settings-cache-count').textContent).toBe('0 Cached Items');
    });

    it('resets settings to defaults when reset button is clicked', () => {
      localStorage.setItem(READER_STORAGE_KEYS.theme, 'emerald');
      initSettingsInteractions();

      const resetBtn = document.getElementById('btn-reset-settings');
      resetBtn.click();

      expect(localStorage.getItem(READER_STORAGE_KEYS.theme)).toBeNull();
      expect(showToast).toHaveBeenCalledWith(
        'All settings reset to default archive presets.',
        'info'
      );
    });
  });

  describe('setupAuthDisplay', () => {
    it('displays anonymous status when user is anonymous', () => {
      document.body.innerHTML = `
        <span id="settings-auth-status"></span>
        <span id="settings-auth-uid"></span>
      `;

      let authCallback;
      onAuthStateChanged.mockImplementation((auth, cb) => {
        authCallback = cb;
      });

      setupAuthDisplay();
      expect(authCallback).toBeDefined();

      authCallback({ uid: 'anon-123', isAnonymous: true });

      expect(document.getElementById('settings-auth-status').textContent).toBe(
        'Anonymous Explorer'
      );
      expect(document.getElementById('settings-auth-uid').textContent).toBe('ID: anon-123');
    });

    it('displays authenticated display name for named users', () => {
      document.body.innerHTML = `
        <span id="settings-auth-status"></span>
        <span id="settings-auth-uid"></span>
      `;

      let authCallback;
      onAuthStateChanged.mockImplementation((auth, cb) => {
        authCallback = cb;
      });

      setupAuthDisplay();
      authCallback({ uid: 'user-456', isAnonymous: false, displayName: 'Scribe Ronin' });

      expect(document.getElementById('settings-auth-status').textContent).toBe('Scribe Ronin');
      expect(document.getElementById('settings-auth-uid').textContent).toBe('ID: user-456');
    });
  });

  describe('Application Interface Themes', () => {
    it('retrieves default app theme when localStorage is empty', () => {
      expect(getSavedAppTheme()).toBe('transcendental');
      expect(DEFAULT_APP_THEME).toBe('transcendental');
    });

    it('persists and applies chosen theme to document element', () => {
      const applied = applyAppTheme('light');
      expect(applied).toBe('light');
      expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('light');
      expect(document.documentElement.getAttribute('data-app-theme')).toBe('light');

      const appliedDark = applyAppTheme('dark');
      expect(appliedDark).toBe('dark');
      expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('dark');
      expect(document.documentElement.getAttribute('data-app-theme')).toBe('dark');
    });

    it('falls back to default transcendental for invalid theme IDs', () => {
      const applied = applyAppTheme('unknown-invalid-theme');
      expect(applied).toBe('transcendental');
      expect(document.documentElement.getAttribute('data-app-theme')).toBe('transcendental');
    });

    it('initializes application theme correctly using initAppTheme', () => {
      localStorage.setItem(APP_THEME_STORAGE_KEY, 'dark');
      const theme = initAppTheme(document);
      expect(theme).toBe('dark');
      expect(document.documentElement.getAttribute('data-app-theme')).toBe('dark');
    });

    it('renders application theme cards with correct active state', () => {
      document.body.innerHTML = `<div id="settings-app-theme-grid"></div>`;
      renderAppThemes('dark');

      const cards = document.querySelectorAll('.app-theme-card');
      expect(cards.length).toBe(APP_THEMES.length);

      const darkCard = document.querySelector('.app-theme-card[data-app-theme="dark"]');
      expect(darkCard).toBeTruthy();
      expect(darkCard.classList.contains('active')).toBe(true);
      expect(darkCard.getAttribute('aria-checked')).toBe('true');

      const transCard = document.querySelector('.app-theme-card[data-app-theme="transcendental"]');
      expect(transCard).toBeTruthy();
      expect(transCard.classList.contains('active')).toBe(false);
      expect(transCard.getAttribute('aria-checked')).toBe('false');
    });

    it('updates theme badge text correctly', () => {
      document.body.innerHTML = `<span id="active-app-theme-badge"></span>`;
      updateActiveAppThemeBadge('light');
      expect(document.getElementById('active-app-theme-badge').textContent).toBe(
        'Illuminated Light'
      );

      updateActiveAppThemeBadge('transcendental');
      expect(document.getElementById('active-app-theme-badge').textContent).toBe('Transcendental');

      updateActiveAppThemeBadge('system');
      expect(document.getElementById('active-app-theme-badge').textContent).toBe(
        'Sync with System'
      );
    });

    it('handles system preference sync theme correctly', () => {
      const applied = applyAppTheme('system');
      expect(applied).toBe('system');
      expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('system');
      expect(document.documentElement.getAttribute('data-theme-preference')).toBe('system');
      const resolved = document.documentElement.getAttribute('data-app-theme');
      expect(['transcendental', 'light']).toContain(resolved);
    });

    it('switches app theme when clicked in the theme grid', () => {
      document.body.innerHTML = `
        <div id="settings-app-theme-grid"></div>
        <span id="active-app-theme-badge"></span>
      `;

      initSettingsInteractions();

      const lightCard = document.querySelector('.app-theme-card[data-app-theme="light"]');
      expect(lightCard).toBeTruthy();
      lightCard.click();

      expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('light');
      expect(document.documentElement.getAttribute('data-app-theme')).toBe('light');
      expect(document.getElementById('active-app-theme-badge').textContent).toBe(
        'Illuminated Light'
      );
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Illuminated Light'), 'info');

      const systemCard = document.querySelector('.app-theme-card[data-app-theme="system"]');
      expect(systemCard).toBeTruthy();
      systemCard.click();

      expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('system');
      expect(document.documentElement.getAttribute('data-theme-preference')).toBe('system');
      expect(document.getElementById('active-app-theme-badge').textContent).toBe(
        'Sync with System'
      );
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Sync with System'), 'info');
    });
  });
});
