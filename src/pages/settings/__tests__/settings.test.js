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
} from '../settings.js';
import { READER_STORAGE_KEYS } from '@config/theme.config.js';
import { auth, onAuthStateChanged, setDoc, getDoc } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: null },
  onAuthStateChanged: vi.fn(),
  refs: { user: vi.fn((uid) => ({ id: uid })) },
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

vi.mock('@ui/components/icons.js', () => ({
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

    it('falls back to /library.html when there is no referrer or external referrer', () => {
      delete window.location;
      window.location = { origin: 'http://localhost:3000', href: '' };

      Object.defineProperty(document, 'referrer', {
        value: '',
        configurable: true,
      });
      Object.defineProperty(window.history, 'length', {
        value: 1,
        configurable: true,
      });

      handleNavigateBack();

      expect(window.location.href).toBe('/library.html');
    });

    it('attaches click listener to #settings-back-btn', () => {
      document.body.innerHTML = '<button id="settings-back-btn"></button>';
      delete window.location;
      window.location = { origin: 'http://localhost:3000', href: '' };

      initSettingsBackButton();

      const backBtn = document.getElementById('settings-back-btn');
      backBtn.click();

      expect(window.location.href).toBe('/library.html');
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
});
