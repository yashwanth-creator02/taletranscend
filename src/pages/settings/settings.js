// src/pages/settings/settings.js
// Logic for Archive & Reader Codex Settings.
// Chrome-inspired settings interface with top header, sidebar navigation, and separate section panels.

import '@css/base.css';
import '@css/components.css';
import '@css/reader-themes.css';
import '@css/pages/settings.css';

import { initIcons } from '@ui/icons.js';
import { showToast } from '@ui/components/toast.js';
import {
  auth,
  onAuthStateChanged,
  refs,
  getDoc,
  setDoc,
  serverTimestamp,
  signInAnonymously,
  upgradeAnonymousToEmail,
  upgradeAnonymousToGoogle,
  updateUserPassword,
  sendPasswordReset,
} from '@fb/index.js';
import {
  createLogger,
  escapeHtml,
  initPageReveal,
  readyReveal,
  validateData,
  UserProfileSchema,
} from '@/utils';
import {
  READER_THEMES,
  FONTS,
  DEFAULT_FONT,
  TYPOGRAPHY_BOUNDS,
  READER_STORAGE_KEYS,
  APP_THEMES,
  DEFAULT_APP_THEME,
  APP_THEME_STORAGE_KEY,
  getSavedAppTheme,
  applyAppTheme,
  initAppTheme,
  loadReaderFontStylesheets,
} from '@config/theme.config.js';
import { GENRE_OPTIONS } from '@pages/profile/state.js';
import { suggestNameFromBio } from '@pages/profile/ai-name.js';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
} from '@/services/ai/apiKey.storage.js';

const log = createLogger('Settings');

export const SETTINGS_DEFAULTS = {
  theme: 'noir',
  fontFamily: DEFAULT_FONT,
  fontSize: TYPOGRAPHY_BOUNDS.fontSize.default,
  lineHeight: TYPOGRAPHY_BOUNDS.lineHeight.default,
  measure: TYPOGRAPHY_BOUNDS.measure.default,
  particles: true,
  audio: true,
  reducedMotion: false,
};

let selectedGenres = new Set();

/**
 * Gets currently selected profile genres.
 * @returns {string[]}
 */
export function getSelectedGenres() {
  return Array.from(selectedGenres);
}

/**
 * Sets selected profile genres.
 * @param {string[]} genres
 */
export function setSelectedGenres(genres = []) {
  selectedGenres = new Set(genres);
}

/**
 * Navigates back to the previous address the page was pushed from,
 * or gracefully falls back to the library if history/referrer is unavailable.
 */
export function handleNavigateBack() {
  if (typeof window === 'undefined') return;
  if (document.referrer && window.history && window.history.length > 1) {
    try {
      const referrerUrl = new URL(document.referrer, window.location.origin);
      if (referrerUrl.origin === window.location.origin) {
        window.history.back();
        return;
      }
    } catch {
      // Malformed referrer URL fallback
    }
  }
  window.location.href = '/library.html';
}

/**
 * Initializes the back button navigation listener.
 */
export function initSettingsBackButton() {
  const backBtn = document.getElementById('settings-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      handleNavigateBack();
    });
  }
}

/**
 * Normalizes section ID input to match DOM element ID convention (e.g., 'profile' -> 'section-profile').
 * @param {string} id
 * @returns {string}
 */
export function normalizeSectionId(id) {
  if (!id) return 'section-profile';
  const clean = String(id).replace(/^[#]/, '').trim();
  if (!clean) return 'section-profile';
  return clean.startsWith('section-') ? clean : `section-${clean}`;
}

/**
 * Switches the visible settings panel to the target section, hiding all others.
 * Updates sidebar active states and synchronizes the URL hash.
 * @param {string} targetId
 * @param {boolean} [updateHash=true]
 */
export function switchSettingsSection(targetId, updateHash = true) {
  const normalized = normalizeSectionId(targetId);
  const sections = document.querySelectorAll('.settings-section, [id^="section-"]');
  const navItems = document.querySelectorAll('.settings-nav-item');
  if (!sections.length && !navItems.length) return;

  // Resolve legacy alias targets if the target element does not directly exist in DOM
  let resolvedId = normalized;
  if (!document.getElementById(resolvedId)) {
    if (resolvedId === 'section-themes' || resolvedId === 'section-system') {
      resolvedId = 'section-general';
    } else if (resolvedId === 'section-typography') {
      resolvedId = 'section-reader';
    }
  }

  let targetSection = document.getElementById(resolvedId);
  if (!targetSection) {
    targetSection = document.getElementById('section-profile') || sections[0];
  }
  const finalId = targetSection ? targetSection.id : resolvedId;

  // Show target section exclusively; hide all others
  sections.forEach((s) => {
    s.style.display = '';
    if (s.id === finalId) {
      s.classList.remove('hidden');
      s.querySelectorAll('[data-setting-item]').forEach((row) => {
        row.style.display = '';
      });
    } else {
      s.classList.add('hidden');
    }
  });

  // Update sidebar active states
  navItems.forEach((btn) => {
    const isMatch = btn.dataset.target === finalId;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
  });

  // Sync URL hash without triggering extra pushState events
  if (updateHash && typeof window !== 'undefined' && window.location) {
    const hashName = finalId.replace(/^section-/, '');
    const currentHash = (window.location.hash || '').replace(/^#/, '');
    if (currentHash !== hashName) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `#${hashName}`);
      } else {
        window.location.hash = hashName;
      }
    }
  }

  // Scroll smoothly to target section
  if (targetSection && typeof targetSection.scrollIntoView === 'function') {
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Sets up sidebar row selection and switches section panels.
 */
export function initSettingsSidebar() {
  const navItems = document.querySelectorAll('.settings-nav-item');
  if (!navItems.length) return;

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;
      switchSettingsSection(targetId, true);
    });
  });

  if (typeof window !== 'undefined' && window.location) {
    window.addEventListener('hashchange', () => {
      const hash = (window.location.hash || '').replace(/^#/, '');
      if (hash) {
        switchSettingsSection(hash, false);
      }
    });

    const initialHash = (window.location.hash || '').replace(/^#/, '');
    if (initialHash) {
      switchSettingsSection(initialHash, false);
    } else {
      switchSettingsSection('section-profile', false);
    }
  }
}

/**
 * Filters settings sections and individual setting rows based on search input query.
 */
export function initSettingsSearch() {
  const searchInput = document.getElementById('settings-search-input');
  const clearBtn = document.getElementById('settings-search-clear');
  const noResultsEl = document.getElementById('settings-no-results');
  const sections = document.querySelectorAll('.settings-section');

  if (!searchInput) return;

  function filterSettings(query) {
    const q = query.trim().toLowerCase();
    let totalMatches = 0;

    if (clearBtn) {
      clearBtn.classList.toggle('hidden', q.length === 0);
    }

    if (q.length === 0) {
      const activeNav = document.querySelector('.settings-nav-item.active');
      const targetId = activeNav?.dataset?.target || 'section-profile';
      switchSettingsSection(targetId, false);
      sections.forEach((s) => {
        s.style.display = '';
      });
      if (noResultsEl) {
        noResultsEl.classList.add('hidden');
      }
      return;
    }

    sections.forEach((section) => {
      const sectionName = (section.getAttribute('data-section-name') || '').toLowerCase();
      const rows = section.querySelectorAll('[data-setting-item]');
      let sectionMatches = 0;

      rows.forEach((row) => {
        const text = (row.textContent || '').toLowerCase();
        const matches = text.includes(q) || sectionName.includes(q);
        row.style.display = matches ? '' : 'none';
        if (matches) {
          sectionMatches++;
          totalMatches++;
        }
      });

      if (sectionMatches > 0) {
        section.classList.remove('hidden');
        section.style.display = '';
      } else {
        section.classList.add('hidden');
        section.style.display = 'none';
      }
    });

    if (noResultsEl) {
      noResultsEl.classList.toggle('hidden', totalMatches > 0);
    }
  }

  searchInput.addEventListener('input', (e) => {
    filterSettings(e.target.value);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterSettings('');
      searchInput.focus();
    });
  }
}

/**
 * Reads all stored preferences with fallback to system defaults.
 * @returns {typeof SETTINGS_DEFAULTS & { moniker: string }}
 */
export function getSavedSettings() {
  const theme = localStorage.getItem(READER_STORAGE_KEYS.theme) || SETTINGS_DEFAULTS.theme;
  const fontFamily =
    localStorage.getItem(READER_STORAGE_KEYS.fontFamily) || SETTINGS_DEFAULTS.fontFamily;
  const fontSize = Number(
    localStorage.getItem(READER_STORAGE_KEYS.fontSize) || SETTINGS_DEFAULTS.fontSize
  );
  const lineHeight = Number(
    localStorage.getItem(READER_STORAGE_KEYS.lineHeight) || SETTINGS_DEFAULTS.lineHeight
  );
  const measure = Number(
    localStorage.getItem(READER_STORAGE_KEYS.measure) || SETTINGS_DEFAULTS.measure
  );

  const particles = localStorage.getItem('tt_settings_particles') !== 'false';
  const audio = localStorage.getItem('tt_settings_audio') !== 'false';
  const reducedMotion = localStorage.getItem('tt_settings_reduced_motion') === 'true';
  const moniker = localStorage.getItem('tt_reader_moniker') || '';

  return {
    theme,
    fontFamily,
    fontSize,
    lineHeight,
    measure,
    particles,
    audio,
    reducedMotion,
    moniker,
  };
}

/**
 * Saves a single key to localStorage.
 * @param {string} key
 * @param {string|number|boolean} value
 */
export function saveSetting(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (err) {
    log.error('Could not save setting', { key, value, err });
  }
}

/**
 * Updates the live reading preview card to mirror current typography & theme selections.
 * @param {ReturnType<typeof getSavedSettings>} settings
 */
export function updatePreview(settings) {
  const previewBox = document.getElementById('settings-preview-box');
  const previewText = document.getElementById('settings-preview-text');
  const previewTitle =
    previewBox?.querySelector('.settings-preview-title') || previewBox?.querySelector('h3');
  if (!previewBox || !previewText) return;

  previewBox.setAttribute('data-reader-theme', settings.theme);
  const themeDef = READER_THEMES.find((t) => t.id === settings.theme) || READER_THEMES[0];
  if (themeDef) {
    previewBox.style.backgroundColor = themeDef.bg;
    previewBox.style.color = themeDef.fg;
    if (previewTitle) {
      previewTitle.style.color = themeDef.fg;
    }
    previewText.style.color = themeDef.fg;
  }
  const fontDef = FONTS[settings.fontFamily] || FONTS[DEFAULT_FONT] || FONTS.serif;
  previewText.style.fontFamily = fontDef.css;
  previewText.style.fontSize = `${settings.fontSize}px`;
  previewText.style.lineHeight = String(settings.lineHeight);
  previewBox.style.maxWidth = `${settings.measure}ch`;
}

/**
 * Updates the text badge showing the currently active application theme.
 * @param {string} themeId
 */
export function updateActiveAppThemeBadge(themeId) {
  const badge = document.getElementById('active-app-theme-badge');
  if (!badge) return;
  const theme = APP_THEMES.find((t) => t.id === themeId);
  badge.textContent = theme ? theme.name : 'Transcendental';
}

/**
 * Renders application theme cards into the app theme grid.
 * @param {string} activeAppTheme
 */
export function renderAppThemes(activeAppTheme) {
  const grid = document.getElementById('settings-app-theme-grid');
  if (!grid) return;

  grid.innerHTML = APP_THEMES.map((theme) => {
    const isActive = theme.id === activeAppTheme;
    return `
      <button
        type="button"
        class="app-theme-card${isActive ? ' active' : ''}"
        data-app-theme="${theme.id}"
        role="radio"
        aria-checked="${isActive ? 'true' : 'false'}"
        title="${escapeHtml(theme.name)} — ${escapeHtml(theme.subtitle)}"
      >
        <div class="app-theme-card__swatch app-theme-swatch--${theme.id}">
          ${
            theme.id === 'system'
              ? `
            <div class="app-theme-preview app-theme-preview--system" aria-hidden="true">
              <div class="app-theme-preview__half app-theme-preview__half--dark">
                <div class="app-theme-preview__chrome">
                  <div class="app-theme-preview__dots">
                    <span class="app-theme-preview__dot"></span>
                    <span class="app-theme-preview__dot"></span>
                  </div>
                </div>
                <div class="app-theme-preview__body">
                  <div class="app-theme-preview__sidebar">
                    <span class="app-theme-preview__nav-bar"></span>
                    <span class="app-theme-preview__nav-bar"></span>
                  </div>
                  <div class="app-theme-preview__main">
                    <div class="app-theme-preview__card">
                      <div class="app-theme-preview__line app-theme-preview__line--title"></div>
                      <div class="app-theme-preview__line app-theme-preview__line--sub"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="app-theme-preview__divider"></div>
              <div class="app-theme-preview__half app-theme-preview__half--light">
                <div class="app-theme-preview__chrome">
                  <div class="app-theme-preview__search"></div>
                </div>
                <div class="app-theme-preview__body">
                  <div class="app-theme-preview__main">
                    <div class="app-theme-preview__card">
                      <div class="app-theme-preview__line app-theme-preview__line--title"></div>
                      <div class="app-theme-preview__badge"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `
              : `
            <div class="app-theme-preview app-theme-preview--${theme.id}" aria-hidden="true">
              <div class="app-theme-preview__chrome">
                <div class="app-theme-preview__dots">
                  <span class="app-theme-preview__dot"></span>
                  <span class="app-theme-preview__dot"></span>
                  <span class="app-theme-preview__dot"></span>
                </div>
                <div class="app-theme-preview__search"></div>
              </div>
              <div class="app-theme-preview__body">
                <div class="app-theme-preview__sidebar">
                  <span class="app-theme-preview__nav-bar"></span>
                  <span class="app-theme-preview__nav-bar"></span>
                  <span class="app-theme-preview__nav-bar"></span>
                </div>
                <div class="app-theme-preview__main">
                  <div class="app-theme-preview__card">
                    <div class="app-theme-preview__line app-theme-preview__line--title"></div>
                    <div class="app-theme-preview__line app-theme-preview__line--sub"></div>
                    <div class="app-theme-preview__btn"></div>
                  </div>
                </div>
              </div>
            </div>
          `
          }
          <div class="app-theme-card__indicator">
            <i data-lucide="check" class="w-3.5 h-3.5 ${isActive ? '' : 'hidden'}"></i>
          </div>
        </div>
        <div class="app-theme-card__header">
          <span class="app-theme-card__title">${escapeHtml(theme.name)}</span>
          <span class="app-theme-card__sub">${escapeHtml(theme.colorScheme)}</span>
        </div>
        <p class="app-theme-card__desc">${escapeHtml(theme.description)}</p>
      </button>
    `;
  }).join('');

  initIcons(grid);
}

/**
 * Renders theme options into the settings theme grid.
 * Displays miniature manuscript specimens with genuine background and ink text sample, without mode tags.
 * @param {string} activeTheme
 */
export function renderThemes(activeTheme) {
  const grid = document.getElementById('settings-theme-grid');
  if (!grid) return;

  grid.innerHTML = READER_THEMES.map((theme) => {
    const isActive = theme.id === activeTheme;
    const isLightModeTheme = theme.mode === 'light';

    return `
      <button
        type="button"
        class="theme-option-card${isActive ? ' active' : ''}"
        data-theme="${theme.id}"
        role="radio"
        aria-checked="${isActive ? 'true' : 'false'}"
        title="${escapeHtml(theme.label)} — ${escapeHtml(theme.sub)}"
      >
        <div
          class="theme-specimen"
          style="background: ${theme.bg}; color: ${theme.fg}; border-color: ${isLightModeTheme ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.12)'};"
        >
          <div class="theme-specimen__header">
            <span
              class="theme-specimen__accent-dot"
              style="background: ${theme.accent};"
              title="Accent: ${theme.accent}"
            ></span>
          </div>
          <div class="theme-specimen__body">
            <div class="theme-specimen__glyph" style="color: ${theme.fg};">Aa</div>
            <div class="theme-specimen__lines" aria-hidden="true">
              <span class="theme-specimen__line" style="background: ${theme.fg};"></span>
              <span class="theme-specimen__line theme-specimen__line--short" style="background: ${theme.fg};"></span>
            </div>
          </div>
        </div>
        <div class="theme-option-card__info">
          <span class="theme-option-card__name">${escapeHtml(theme.label)}</span>
          <span class="theme-option-card__sub">${escapeHtml(theme.sub)}</span>
        </div>
      </button>
    `;
  }).join('');
}

/**
 * Renders available font family chips with theme-aware contrast styling.
 * @param {string} activeFont
 */
export function renderFonts(activeFont) {
  const container = document.getElementById('settings-font-list');
  if (!container) return;

  container.innerHTML = Object.entries(FONTS)
    .map(([fontId, font]) => {
      const isActive = fontId === activeFont;
      return `
      <button
        type="button"
        class="settings-font-chip${isActive ? ' active' : ''}"
        data-font="${fontId}"
        role="radio"
        aria-checked="${isActive ? 'true' : 'false'}"
      >
        <div class="min-w-0">
          <span class="settings-font-chip__title text-xs font-bold block" style="font-family: ${font.css};">
            ${escapeHtml(font.label)}
          </span>
          <span class="settings-font-chip__sub text-[10px] block">${escapeHtml(font.sub || '')}</span>
        </div>
        <span
          class="settings-font-chip__specimen"
          aria-hidden="true"
          style="font-family: ${font.css};"
          >Aa</span
        >
        <i data-lucide="check" class="w-4 h-4 text-indigo-400 font-check ${isActive ? '' : 'hidden'}"></i>
      </button>
    `;
    })
    .join('');

  initIcons(container);
}

/**
 * Counts the bytes a stored value occupies.
 * @param {string} value
 * @returns {number}
 */
function archiveByteSize(value) {
  try {
    return new Blob([value]).size;
  } catch {
    return value.length;
  }
}

/**
 * Formats a byte count for the archive summary.
 * @param {number} bytes
 * @returns {string}
 */
function formatArchiveSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Turns a stored tale id into a readable label.
 * @param {string} taleId
 * @returns {string}
 */
function formatArchiveTale(taleId) {
  const cleaned = String(taleId)
    .replace(/^tale[_-]?/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!cleaned) return 'Untitled tale';
  const title = cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  return /^\d+$/.test(title) ? `Tale ${title}` : title;
}

/**
 * Describes a stored reading-progress value.
 * @param {string} raw
 * @returns {string}
 */
function describeProgressEntry(raw) {
  try {
    const parsed = JSON.parse(raw);
    const pct = Number(parsed?.pct ?? parsed?.percent ?? parsed?.progress);
    if (Number.isFinite(pct)) return `${Math.round(pct)}% read`;
    if (parsed?.scrollTop != null || parsed?.scroll != null) return 'Scroll position saved';
    if (parsed?.chapter) return `Chapter ${parsed.chapter}`;
  } catch {
    // Stored value is not JSON; fall through to the generic label.
  }
  return 'Reading position saved';
}

/**
 * Describes a stored inquiry thread.
 * @param {string} raw
 * @returns {string}
 */
function describeInquiryEntry(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const count = parsed.length;
      return `${count} ${count === 1 ? 'missive' : 'missives'} archived`;
    }
  } catch {
    // Stored value is not JSON; fall through to the generic label.
  }
  return 'Inquiry thread archived';
}

/**
 * Calculates local cache statistics and itemizes the stored records.
 * @returns {{
 *   progressCount: number,
 *   moniker: string,
 *   entries: Array<{key: string, kind: string, icon: string, id: string, label: string, detail: string, bytes: number}>,
 *   totalBytes: number
 * }}
 */
export function getArchivalStats() {
  const entries = [];
  let moniker = 'None recorded';
  try {
    moniker = localStorage.getItem('tt_reader_moniker') || 'None recorded';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('tt_progress_')) {
        const raw = localStorage.getItem(key) || '';
        const taleId = key.slice('tt_progress_'.length);
        entries.push({
          key,
          kind: 'Reading progress',
          icon: 'book-open',
          id: taleId,
          label: formatArchiveTale(taleId),
          detail: describeProgressEntry(raw),
          bytes: archiveByteSize(raw),
        });
      } else if (key.startsWith('tt_inquiries_')) {
        const raw = localStorage.getItem(key) || '';
        const taleId = key.slice('tt_inquiries_'.length);
        entries.push({
          key,
          kind: 'Inquiry thread',
          icon: 'message-square',
          id: taleId,
          label: formatArchiveTale(taleId),
          detail: describeInquiryEntry(raw),
          bytes: archiveByteSize(raw),
        });
      }
    }
  } catch {
    // Storage may be unavailable; return whatever was collected.
  }

  entries.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label) || a.key.localeCompare(b.key)
  );

  return {
    progressCount: entries.length,
    moniker,
    entries,
    totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
  };
}

/**
 * Renders the itemized list of records held in the local archive.
 * @param {ReturnType<typeof getArchivalStats>} [stats]
 */
export function renderStorageArchive(stats = getArchivalStats()) {
  const list = document.getElementById('settings-storage-list');
  const meta = document.getElementById('settings-storage-meta');
  if (!list) return;

  const count = stats.entries.length;
  if (meta) {
    meta.textContent = `${count} ${count === 1 ? 'record' : 'records'}, ${formatArchiveSize(stats.totalBytes)}`;
  }

  if (!count) {
    list.innerHTML = `
      <div class="settings-storage-empty">
        <i data-lucide="archive" class="settings-storage-empty__icon" aria-hidden="true"></i>
        <p class="settings-storage-empty__text">
          No reading records yet. Progress and inquiry threads saved on this device will appear
          here.
        </p>
      </div>
    `;
    initIcons(list);
    return;
  }

  list.innerHTML = stats.entries
    .map(
      (entry) => `
        <div class="settings-storage-item" title="${escapeHtml(entry.key)}">
          <span class="settings-storage-item__icon" aria-hidden="true">
            <i data-lucide="${entry.icon}"></i>
          </span>
          <div class="settings-storage-item__text">
            <span class="settings-storage-item__title">${escapeHtml(entry.kind)}</span>
            <span class="settings-storage-item__sub">
              ${escapeHtml(entry.label)}, ${escapeHtml(entry.detail)}
            </span>
          </div>
          <span class="settings-storage-item__size">${formatArchiveSize(entry.bytes)}</span>
        </div>
      `
    )
    .join('');
  initIcons(list);
}

/**
 * Renders genre selection chips for profile identity.
 * @param {string[]} genres
 */
export function renderProfileGenres(genres = []) {
  const container = document.getElementById('genre-selector');
  if (!container) return;
  setSelectedGenres(genres);

  container.innerHTML = GENRE_OPTIONS.map((genre) => {
    const isSelected = selectedGenres.has(genre);
    return `
      <button
        type="button"
        class="genre-chip${isSelected ? ' active' : ''}"
        data-genre="${escapeHtml(genre)}"
        role="checkbox"
        aria-checked="${isSelected ? 'true' : 'false'}"
      >
        ${escapeHtml(genre)}
      </button>
    `;
  }).join('');
}

/**
 * Updates the avatar preview element.
 * @param {string} url
 */
export function updateAvatarPreview(url) {
  const previewImg = document.getElementById('modal-avatar-preview');
  const fallbackIcon = document.getElementById('modal-avatar-fallback');
  if (!previewImg || !fallbackIcon) return;

  const cleanUrl = (url || '').trim();
  if (cleanUrl) {
    previewImg.src = cleanUrl;
    previewImg.classList.remove('hidden');
    fallbackIcon.classList.add('hidden');
    previewImg.onerror = () => {
      previewImg.classList.add('hidden');
      fallbackIcon.classList.remove('hidden');
    };
  } else {
    previewImg.classList.add('hidden');
    fallbackIcon.classList.remove('hidden');
    previewImg.src = '';
  }
}

/**
 * Validates and commits chronicler profile changes to Firestore.
 * @returns {Promise<boolean>}
 */
export async function handleSaveProfile() {
  if (!auth.currentUser) {
    showToast('Please sign in or initialize anonymous auth before saving profile.', 'error');
    return false;
  }

  const uid = auth.currentUser.uid;
  const saveBtn = document.getElementById('btn-save-profile');

  const nameInput = document.getElementById('input-name');
  const bioInput = document.getElementById('input-bio');
  const pronounsInput = document.getElementById('input-pronouns');
  const avatarUrlInput = document.getElementById('input-avatar-url');
  const locationInput = document.getElementById('input-location');
  const websiteInput = document.getElementById('input-website');
  const twitterInput = document.getElementById('input-twitter');
  const instagramInput = document.getElementById('input-instagram');
  const readingGoalInput = document.getElementById('input-reading-goal');

  const data = {
    name: nameInput?.value?.trim() || '',
    bio: bioInput?.value?.trim() || '',
    pronouns: pronounsInput?.value?.trim() || '',
    avatarUrl: avatarUrlInput?.value?.trim() || '',
    location: locationInput?.value?.trim() || '',
    website: websiteInput?.value?.trim() || '',
    twitterHandle: twitterInput?.value?.trim() || '',
    instagramHandle: instagramInput?.value?.trim() || '',
    readingGoal: Number(readingGoalInput?.value) || 12,
    favouriteGenres: getSelectedGenres(),
  };

  const validation = validateData(UserProfileSchema, data);
  if (!validation.success) {
    showToast(validation.error, 'error');
    return false;
  }

  const originalHtml = saveBtn?.innerHTML;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="inline-block animate-spin mr-1">✦</span> Saving...';
  }

  try {
    const userRef = refs.user(uid);
    const snap = await getDoc(userRef);

    const updateData = {
      ...validation.data,
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      updateData.createdAt = serverTimestamp();
      updateData.joinedAt = serverTimestamp();
      updateData.role = 'reader';
      updateData.isBanned = false;
    }

    await setDoc(userRef, updateData, { merge: true });

    if (data.name) {
      saveSetting('tt_reader_moniker', data.name);
      const monikerInput = document.getElementById('setting-reader-moniker');
      if (monikerInput) monikerInput.value = data.name;
    }

    const keyInput = document.getElementById('input-gemini-key');
    if (keyInput) {
      const keyVal = keyInput.value.trim();
      if (keyVal) {
        setStoredApiKey(keyVal);
      } else if (keyInput.value === '') {
        clearStoredApiKey();
      }
      updateGeminiKeyBadge();
    }

    showToast('Chronicler profile saved to living archive.', 'success');
    return true;
  } catch (err) {
    log.error('Failed to save profile', err);
    showToast('Failed to save profile. Please check your connection.', 'error');
    return false;
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
      initIcons(saveBtn);
    }
  }
}

/**
 * Updates the bio character count display element.
 * @param {number} count
 */
export function updateBioCharCount(count = 0) {
  const counter = document.getElementById('bio-char-count');
  if (counter) {
    counter.textContent = `${count} / 1000`;
  }
}

/**
 * Updates the Gemini API Key status badge and modal trigger button text.
 */
export function updateGeminiKeyBadge() {
  const key = getStoredApiKey() || document.getElementById('input-gemini-key')?.value?.trim();
  const statusBadge = document.getElementById('gemini-key-status');
  const statusText = document.getElementById('gemini-key-status-text');
  const openBtnText = document.getElementById('btn-open-gemini-text');

  const isConfigured = Boolean(key && key.length > 0);

  if (statusBadge) {
    statusBadge.classList.toggle('settings-status-badge--active', isConfigured);
    statusBadge.classList.toggle('settings-status-badge--inactive', !isConfigured);
  }
  if (statusText) {
    statusText.textContent = isConfigured ? 'Key Configured' : 'Not Configured';
  }
  if (openBtnText) {
    openBtnText.textContent = isConfigured ? 'Manage Key' : 'Configure Key';
  }
}

/**
 * Initializes the popup modal dialog for managing the Google Gemini API key.
 */
export function initGeminiKeyModal() {
  const modal = document.getElementById('modal-gemini-key');
  const openBtn = document.getElementById('btn-open-gemini-key-modal');
  const closeBtn = document.getElementById('modal-gemini-close');
  const backdrop = document.getElementById('modal-gemini-backdrop');
  const cancelBtn = document.getElementById('btn-cancel-modal-key');
  const saveBtn = document.getElementById('btn-save-modal-key');
  const clearBtn = document.getElementById('btn-clear-modal-key');
  const toggleBtn = document.getElementById('btn-toggle-modal-key');
  const modalInput = document.getElementById('input-gemini-key-modal');
  const hiddenInput = document.getElementById('input-gemini-key');

  if (!modal) return;

  function openModal() {
    const currentKey = getStoredApiKey() || hiddenInput?.value?.trim() || '';
    if (modalInput) {
      modalInput.value = currentKey;
      modalInput.type = 'password';
    }
    if (toggleBtn) {
      toggleBtn.textContent = 'Show';
    }
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    if (modalInput) {
      setTimeout(() => modalInput.focus(), 50);
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (openBtn) {
      openBtn.focus();
    }
  }

  if (openBtn) {
    openBtn.addEventListener('click', openModal);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  if (toggleBtn && modalInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = modalInput.type === 'password';
      modalInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
  }

  if (saveBtn && modalInput) {
    saveBtn.addEventListener('click', () => {
      const val = modalInput.value.trim();
      if (val) {
        setStoredApiKey(val);
        if (hiddenInput) hiddenInput.value = val;
        showToast('Gemini API key stored securely in local storage.', 'success');
      } else {
        clearStoredApiKey();
        if (hiddenInput) hiddenInput.value = '';
        showToast('Gemini API key removed.', 'info');
      }
      updateGeminiKeyBadge();
      closeModal();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearStoredApiKey();
      if (hiddenInput) hiddenInput.value = '';
      if (modalInput) modalInput.value = '';
      updateGeminiKeyBadge();
      showToast('Gemini API key removed.', 'info');
      closeModal();
    });
  }

  updateGeminiKeyBadge();
}

/**
 * Initializes listeners for Chronicler Profile controls.
 */
export function initProfileSettings() {
  const profileForm = document.getElementById('settings-profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveProfile();
    });
  }

  const saveProfileBtn = document.getElementById('btn-save-profile');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleSaveProfile();
    });
  }

  const genreContainer = document.getElementById('genre-selector');
  if (genreContainer) {
    genreContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.genre-chip');
      if (!chip) return;
      const genre = chip.dataset.genre;
      if (!genre) return;

      if (selectedGenres.has(genre)) {
        selectedGenres.delete(genre);
        chip.classList.remove('active');
        chip.setAttribute('aria-checked', 'false');
      } else {
        if (selectedGenres.size >= 10) {
          showToast('You may select up to 10 favourite genres.', 'info');
          return;
        }
        selectedGenres.add(genre);
        chip.classList.add('active');
        chip.setAttribute('aria-checked', 'true');
      }
    });
  }

  const avatarInput = document.getElementById('input-avatar-url');
  if (avatarInput) {
    avatarInput.addEventListener('input', (e) => {
      updateAvatarPreview(e.target.value);
    });

    document.querySelectorAll('.avatar-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetUrl = btn.dataset.avatarPreset;
        if (presetUrl) {
          avatarInput.value = presetUrl;
          updateAvatarPreview(presetUrl);
        }
      });
    });
  }

  const bioInput = document.getElementById('input-bio');
  if (bioInput) {
    updateBioCharCount(bioInput.value.length);
    bioInput.addEventListener('input', () => {
      updateBioCharCount(bioInput.value.length);
    });
  }

  const suggestBtn = document.getElementById('btn-suggest-name');
  if (suggestBtn) {
    suggestBtn.addEventListener('click', async () => {
      const currentBioInput = document.getElementById('input-bio');
      const bio = currentBioInput?.value?.trim();
      if (!bio) {
        showToast(
          'Please record lore or a short bio first so the Oracle can suggest a moniker.',
          'info'
        );
        return;
      }

      const originalHtml = suggestBtn.innerHTML;
      suggestBtn.disabled = true;
      suggestBtn.innerHTML = '<span class="inline-block animate-spin mr-1">✦</span> Conjuring...';

      try {
        const suggestion = await suggestNameFromBio(bio);
        if (suggestion) {
          const nameInput = document.getElementById('input-name');
          if (nameInput) {
            nameInput.value = suggestion;
            showToast(`Oracle conjured name: ${suggestion}`, 'success');
          }
        } else {
          showToast(
            'Could not summon name suggestion. Ensure your Gemini API key is configured.',
            'error'
          );
        }
      } catch (err) {
        log.error('Failed to suggest name', err);
        showToast('Oracle suggestion failed.', 'error');
      } finally {
        suggestBtn.disabled = false;
        suggestBtn.innerHTML = originalHtml;
        initIcons(suggestBtn);
      }
    });
  }

  const keyInput = document.getElementById('input-gemini-key');
  const toggleBtn = document.getElementById('btn-toggle-gemini-key');
  const saveKeyBtn = document.getElementById('btn-save-gemini-key');

  if (keyInput) {
    keyInput.value = getStoredApiKey() || '';
  }
  if (toggleBtn && keyInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = keyInput.type === 'password';
      keyInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
  }
  if (saveKeyBtn && keyInput) {
    saveKeyBtn.addEventListener('click', () => {
      const val = keyInput.value.trim();
      if (val) {
        setStoredApiKey(val);
        showToast('Gemini API key saved securely in local storage.', 'success');
      } else {
        clearStoredApiKey();
        showToast('Gemini API key cleared.', 'info');
      }
      updateGeminiKeyBadge();
    });
  }

  initGeminiKeyModal();
}

/**
 * Initializes interactive controls on the Settings page.
 */
export function initSettingsInteractions() {
  const settings = getSavedSettings();

  initSettingsBackButton();
  initSettingsSidebar();
  initSettingsSearch();
  initProfileSettings();

  const currentAppTheme = getSavedAppTheme();
  renderAppThemes(currentAppTheme);
  updateActiveAppThemeBadge(currentAppTheme);

  renderThemes(settings.theme);
  renderFonts(settings.fontFamily);
  updatePreview(settings);

  // App Theme Clicks
  const appThemeGrid = document.getElementById('settings-app-theme-grid');
  if (appThemeGrid) {
    appThemeGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.app-theme-card');
      if (!card) return;
      const themeId = card.dataset.appTheme;
      if (!themeId) return;

      applyAppTheme(themeId);
      renderAppThemes(themeId);
      updateActiveAppThemeBadge(themeId);
      const appliedTheme = APP_THEMES.find((t) => t.id === themeId);
      showToast(`Application theme set to ${appliedTheme?.name || themeId}`, 'info');
    });
  }

  if (typeof window !== 'undefined' && !window._settingsAppThemeListenerBound) {
    window._settingsAppThemeListenerBound = true;
    window.addEventListener('appthemechange', (e) => {
      const themeId = e.detail?.theme;
      if (themeId) {
        renderAppThemes(themeId);
        updateActiveAppThemeBadge(themeId);
      }
    });
  }

  // Sliders and Value Displays
  const sizeSlider = document.getElementById('setting-font-size');
  const sizeValue = document.getElementById('setting-font-size-val');
  if (sizeSlider && sizeValue) {
    sizeSlider.value = String(settings.fontSize);
    sizeValue.textContent = `${settings.fontSize}px`;
    sizeSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      sizeValue.textContent = `${val}px`;
      saveSetting(READER_STORAGE_KEYS.fontSize, val);
      settings.fontSize = val;
      updatePreview(settings);
    });
  }

  const lhSlider = document.getElementById('setting-line-height');
  const lhValue = document.getElementById('setting-line-height-val');
  if (lhSlider && lhValue) {
    lhSlider.value = String(settings.lineHeight);
    lhValue.textContent = `${settings.lineHeight}`;
    lhSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      lhValue.textContent = `${val}`;
      saveSetting(READER_STORAGE_KEYS.lineHeight, val);
      settings.lineHeight = val;
      updatePreview(settings);
    });
  }

  // Measure Buttons
  const measureButtons = document.querySelectorAll('.setting-measure-btn');
  measureButtons.forEach((btn) => {
    const val = Number(btn.dataset.measure || 68);
    if (val === settings.measure) btn.classList.add('btn-primary');
    btn.addEventListener('click', () => {
      measureButtons.forEach((b) => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      saveSetting(READER_STORAGE_KEYS.measure, val);
      settings.measure = val;
      updatePreview(settings);
      showToast(`Reading column measure adjusted to ${val}ch`, 'info');
    });
  });

  // Theme Clicks
  const themeGrid = document.getElementById('settings-theme-grid');
  if (themeGrid) {
    themeGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.theme-option-card');
      if (!card) return;
      const themeId = card.dataset.theme;
      if (!themeId) return;

      themeGrid.querySelectorAll('.theme-option-card').forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('active');
      card.setAttribute('aria-checked', 'true');

      saveSetting(READER_STORAGE_KEYS.theme, themeId);
      settings.theme = themeId;
      updatePreview(settings);
      showToast(`Reading theme set to ${themeId}`, 'info');
    });
  }

  // Font Clicks
  const fontList = document.getElementById('settings-font-list');
  if (fontList) {
    fontList.addEventListener('click', (e) => {
      const chip = e.target.closest('.settings-font-chip');
      if (!chip) return;
      const fontId = chip.dataset.font;
      if (!fontId) return;

      fontList.querySelectorAll('.settings-font-chip').forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
        c.querySelector('.font-check')?.classList.add('hidden');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
      chip.querySelector('.font-check')?.classList.remove('hidden');

      saveSetting(READER_STORAGE_KEYS.fontFamily, fontId);
      settings.fontFamily = fontId;
      updatePreview(settings);
      showToast(`Codex typography set to ${fontId}`, 'info');
    });
  }

  // Toggles
  const particlesToggle = document.getElementById('setting-particles');
  if (particlesToggle) {
    particlesToggle.checked = settings.particles;
    particlesToggle.addEventListener('change', () => {
      saveSetting('tt_settings_particles', particlesToggle.checked);
      showToast(
        particlesToggle.checked ? 'Atmospheric dust enabled' : 'Atmospheric dust silenced',
        'info'
      );
    });
  }

  const audioToggle = document.getElementById('setting-audio');
  if (audioToggle) {
    audioToggle.checked = settings.audio;
    audioToggle.addEventListener('change', () => {
      saveSetting('tt_settings_audio', audioToggle.checked);
      showToast(audioToggle.checked ? 'Archival audio enabled' : 'Archival audio silenced', 'info');
    });
  }

  const motionToggle = document.getElementById('setting-reduced-motion');
  if (motionToggle) {
    motionToggle.checked = settings.reducedMotion;
    motionToggle.addEventListener('change', () => {
      saveSetting('tt_settings_reduced_motion', motionToggle.checked);
      showToast(motionToggle.checked ? 'Reduced motion enabled' : 'Normal motion restored', 'info');
    });
  }

  // Moniker Input
  const monikerInput = document.getElementById('setting-reader-moniker');
  if (monikerInput) {
    monikerInput.value = settings.moniker;
    monikerInput.addEventListener('change', () => {
      const val = monikerInput.value.trim();
      saveSetting('tt_reader_moniker', val);
      showToast(val ? `Reader moniker saved as ${val}` : 'Reader moniker cleared', 'success');
    });
  }

  // Cache Statistics & Archive Contents
  const stats = getArchivalStats();
  const cacheStatsCount = document.getElementById('settings-cache-count');
  if (cacheStatsCount) {
    const total = stats.entries.length;
    cacheStatsCount.textContent = `${total} Cached ${total === 1 ? 'Item' : 'Items'}`;
  }
  renderStorageArchive(stats);

  const clearCacheBtn = document.getElementById('btn-clear-reading-cache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      let count = 0;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tt_progress_') || key.startsWith('tt_inquiries_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        localStorage.removeItem(k);
        count++;
      });
      if (cacheStatsCount) cacheStatsCount.textContent = '0 Cached Items';
      renderStorageArchive();
      showToast(`Cleared ${count} cached reading progress entries.`, 'success');
    });
  }

  // Reset Defaults Function
  function handleResetDefaults() {
    Object.entries(SETTINGS_DEFAULTS).forEach(([key]) => {
      if (READER_STORAGE_KEYS[key]) {
        localStorage.removeItem(READER_STORAGE_KEYS[key]);
      }
    });
    localStorage.removeItem('tt_settings_particles');
    localStorage.removeItem('tt_settings_audio');
    localStorage.removeItem('tt_settings_reduced_motion');
    localStorage.removeItem(APP_THEME_STORAGE_KEY);

    applyAppTheme(DEFAULT_APP_THEME);
    renderAppThemes(DEFAULT_APP_THEME);
    updateActiveAppThemeBadge(DEFAULT_APP_THEME);

    const freshSettings = getSavedSettings();
    renderThemes(freshSettings.theme);
    renderFonts(freshSettings.fontFamily);
    if (sizeSlider && sizeValue) {
      sizeSlider.value = String(freshSettings.fontSize);
      sizeValue.textContent = `${freshSettings.fontSize}px`;
    }
    if (lhSlider && lhValue) {
      lhSlider.value = String(freshSettings.lineHeight);
      lhValue.textContent = `${freshSettings.lineHeight}`;
    }
    if (particlesToggle) particlesToggle.checked = freshSettings.particles;
    if (audioToggle) audioToggle.checked = freshSettings.audio;
    if (motionToggle) motionToggle.checked = freshSettings.reducedMotion;

    updatePreview(freshSettings);
    showToast('All settings reset to default archive presets.', 'info');
  }

  const resetBtn = document.getElementById('btn-reset-settings');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleResetDefaults);
  }

  const resetSystemBtn = document.getElementById('btn-reset-system-defaults');
  if (resetSystemBtn) {
    resetSystemBtn.addEventListener('click', handleResetDefaults);
  }
}

/**
 * Sets up auth details on the settings page and populates profile data.
 */
export function setupAuthDisplay() {
  const authStatusEl = document.getElementById('settings-auth-status');
  const uidDisplayEl = document.getElementById('settings-auth-uid');

  onAuthStateChanged(auth, async (user) => {
    if (authStatusEl) {
      if (user) {
        authStatusEl.textContent = user.isAnonymous
          ? 'Anonymous Explorer'
          : user.displayName || user.email || 'Authenticated Scribe';
      } else {
        authStatusEl.textContent = 'Guest / Anonymous';
      }
    }
    if (uidDisplayEl) {
      uidDisplayEl.textContent = user?.uid ? `ID: ${user.uid}` : 'Unauthenticated';
    }

    if (user) {
      try {
        const userDoc = await getDoc(refs.user(user.uid));
        if (userDoc && typeof userDoc.exists === 'function' && userDoc.exists()) {
          const d = userDoc.data();
          const nameInput = document.getElementById('input-name');
          const bioInput = document.getElementById('input-bio');
          const pronounsInput = document.getElementById('input-pronouns');
          const avatarUrlInput = document.getElementById('input-avatar-url');
          const locationInput = document.getElementById('input-location');
          const websiteInput = document.getElementById('input-website');
          const twitterInput = document.getElementById('input-twitter');
          const instagramInput = document.getElementById('input-instagram');
          const readingGoalInput = document.getElementById('input-reading-goal');

          if (nameInput) nameInput.value = d.name || user.displayName || '';
          if (bioInput) {
            bioInput.value = d.bio || '';
            updateBioCharCount(bioInput.value.length);
          }
          if (pronounsInput) pronounsInput.value = d.pronouns || '';
          if (avatarUrlInput) {
            avatarUrlInput.value = d.avatarUrl || user.photoURL || '';
            updateAvatarPreview(avatarUrlInput.value);
          }
          if (locationInput) locationInput.value = d.location || '';
          if (websiteInput) websiteInput.value = d.website || '';
          if (twitterInput) twitterInput.value = d.twitterHandle || '';
          if (instagramInput) instagramInput.value = d.instagramHandle || '';
          if (readingGoalInput) readingGoalInput.value = String(d.readingGoal ?? 12);
          renderProfileGenres(d.favouriteGenres || []);
        } else {
          const nameInput = document.getElementById('input-name');
          if (nameInput && !nameInput.value) {
            nameInput.value = user.displayName || '';
          }
          renderProfileGenres([]);
        }
      } catch (err) {
        log.error('Could not populate profile from Firestore', err);
        renderProfileGenres([]);
      }
    } else {
      renderProfileGenres([]);
    }
  });
}

const ACCOUNT_SIGN_IN_URL = '/login.html?returnUrl=%2Fsettings.html%23section-accounts';

/**
 * Maps Firebase Auth failures to copy a chronicler can act on.
 * Returns an empty string for dismissals that should not raise an alert.
 * @param {any} err
 * @returns {string}
 */
function accountErrorText(err) {
  switch (err?.code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'That email is already connected to another chronicle. {signin} to that account instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Use a password with at least 8 characters.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The current password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again shortly.';
    case 'auth/popup-blocked':
      return 'Allow popups for this site, then try Google again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for the archive yet.';
    case 'auth/requires-recent-login':
      return 'Sign in again before changing this credential.';
    case 'auth/network-request-failed':
      return 'The archive could not be reached. Check your connection.';
    default:
      return err?.message || 'The account change could not be completed.';
  }
}

/**
 * Shows or clears an inline account error.
 * @param {HTMLElement | null} el
 * @param {string} message
 */
function setAccountAlert(el, message) {
  if (!el) return;
  el.textContent = '';
  el.hidden = !message;
  if (!message) return;

  const marker = '{signin}';
  const markerIndex = message.indexOf(marker);
  if (markerIndex === -1) {
    el.textContent = message;
    return;
  }

  const before = message.slice(0, markerIndex);
  const after = message.slice(markerIndex + marker.length);
  const link = document.createElement('a');
  link.href = ACCOUNT_SIGN_IN_URL;
  link.className = 'settings-account-alert__link';
  link.textContent = 'Sign in';
  link.setAttribute('aria-label', 'Sign in to the existing account');

  if (before) el.append(document.createTextNode(before));
  el.append(link);
  if (after) el.append(document.createTextNode(after));
}

/**
 * Toggles a submit control while an auth request is in flight.
 * @param {HTMLButtonElement | null} button
 * @param {boolean} busy
 */
function setAccountBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  button.classList.toggle('is-busy', busy);
}

/**
 * Returns a human label for the providers linked to the account.
 * @param {import('firebase/auth').User | null} user
 * @returns {string}
 */
function accountProviderLabel(user) {
  if (!user || user.isAnonymous) return 'Anonymous session';
  const providers = Array.isArray(user.providerData)
    ? user.providerData.map((provider) => provider.providerId)
    : [];
  const hasPassword = providers.includes('password');
  const hasGoogle = providers.includes('google.com');
  if (hasPassword && hasGoogle) return 'Email & Google';
  if (hasPassword) return 'Email & password';
  if (hasGoogle) return 'Google';
  return 'Authenticated session';
}

/**
 * Reflects the current auth identity into the Accounts section.
 * Guest, email/password, and Google accounts each get a distinct state.
 * @param {import('firebase/auth').User | null} user
 */
export function renderAccountState(user) {
  const signedIn = Boolean(user) && !user.isAnonymous;
  const email = user?.email || '';
  const providers = Array.isArray(user?.providerData)
    ? user.providerData.map((provider) => provider.providerId)
    : [];
  const hasPassword = providers.includes('password');
  const hasGoogle = providers.includes('google.com');

  const status = document.getElementById('settings-account-status');
  const statusSub = document.getElementById('settings-account-status-sub');
  const emailInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-account-email')
  );
  const provider = document.getElementById('settings-account-provider');
  const sync = document.getElementById('settings-account-sync');
  const syncSub = document.getElementById('settings-account-sync-sub');
  const elevateCard = document.getElementById('settings-elevate-card');
  const passwordCard = document.getElementById('settings-password-card');
  const googleCard = document.getElementById('settings-google-card');

  if (status) {
    status.textContent = signedIn ? 'Signed in' : 'Guest';
    status.className = `settings-status-badge settings-status-badge--${
      signedIn ? 'active' : 'inactive'
    }`;
  }
  if (statusSub) {
    statusSub.textContent = signedIn
      ? 'Your chronicle is secured to this account.'
      : 'Writing as a guest on this device.';
  }
  if (emailInput) {
    emailInput.value = email;
    emailInput.title = email;
  }
  if (provider) provider.textContent = accountProviderLabel(user);
  if (sync) {
    sync.textContent = signedIn ? 'Cloud archive' : 'Guest session';
    sync.className = `settings-status-badge settings-status-badge--${
      signedIn ? 'active' : 'inactive'
    }`;
  }
  if (syncSub) {
    syncSub.textContent = signedIn
      ? 'Your archive follows this account across devices.'
      : 'Elevate to keep this archive across devices.';
  }

  if (elevateCard) elevateCard.hidden = signedIn;
  if (passwordCard) passwordCard.hidden = !(signedIn && hasPassword);
  if (googleCard) googleCard.hidden = !(signedIn && hasGoogle && !hasPassword);
}

/**
 * Guarantees a Firebase user exists before an elevation attempt.
 * Settings can be opened directly on a cold browser with no restored session;
 * the rest of the archive is anonymous-first, so create the guest identity here
 * rather than failing the link.
 * @returns {Promise<import('firebase/auth').User>}
 */
async function ensureAccountUser() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

/**
 * Wires the Accounts section: guest elevation via email or Google, the
 * read-only email display, password updates, and recovery mail.
 */
export function setupAccountSettings() {
  const elevateForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('settings-elevate-form')
  );
  const elevateEmail = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-elevate-email')
  );
  const elevatePassword = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-elevate-password')
  );
  const elevateButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('btn-elevate-email')
  );
  const googleButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('btn-elevate-google')
  );
  const accountAlert = document.getElementById('settings-account-alert');

  const passwordForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('settings-password-form')
  );
  const currentPassword = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-current-password')
  );
  const newPassword = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-new-password')
  );
  const confirmPassword = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-confirm-password')
  );
  const updateButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('btn-update-password')
  );
  const resetButton = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('btn-send-password-reset')
  );
  const passwordAlert = document.getElementById('settings-password-alert');

  if (!elevateForm && !passwordForm) return;

  onAuthStateChanged(auth, (user) => {
    renderAccountState(user);
  });

  // Do not create an anonymous identity before Firebase has restored a
  // persisted session: that would replace a returning signed-in visitor with
  // a fresh guest. The elevation handlers call ensureAccountUser() only after
  // the visitor acts, when the auth state has settled.

  elevateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAccountAlert(accountAlert, '');
    const email = elevateEmail?.value.trim() || '';
    const password = elevatePassword?.value || '';

    if (!email || !email.includes('@')) {
      setAccountAlert(accountAlert, 'Enter a valid email address.');
      elevateEmail?.focus();
      return;
    }
    if (password.length < 8) {
      setAccountAlert(accountAlert, 'Use a password with at least 8 characters.');
      elevatePassword?.focus();
      return;
    }

    setAccountBusy(elevateButton, true);
    try {
      await ensureAccountUser();
      const user = await upgradeAnonymousToEmail(email, password);
      renderAccountState(user);
      elevateForm.reset();
      showToast('Chronicle secured. Cloud saving is now active.', 'success');
    } catch (err) {
      const message = accountErrorText(err);
      if (message) setAccountAlert(accountAlert, message);
    } finally {
      setAccountBusy(elevateButton, false);
    }
  });

  googleButton?.addEventListener('click', async () => {
    setAccountAlert(accountAlert, '');
    setAccountBusy(googleButton, true);
    try {
      await ensureAccountUser();
      const user = await upgradeAnonymousToGoogle();
      renderAccountState(user);
      showToast('Chronicle secured with Google. Cloud saving is active.', 'success');
    } catch (err) {
      const message = accountErrorText(err);
      if (message) setAccountAlert(accountAlert, message);
    } finally {
      setAccountBusy(googleButton, false);
    }
  });

  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAccountAlert(passwordAlert, '');
    const current = currentPassword?.value || '';
    const next = newPassword?.value || '';
    const confirmation = confirmPassword?.value || '';

    if (!current) {
      setAccountAlert(passwordAlert, 'Enter your current password.');
      currentPassword?.focus();
      return;
    }
    if (next.length < 8) {
      setAccountAlert(passwordAlert, 'Use a new password with at least 8 characters.');
      newPassword?.focus();
      return;
    }
    if (next !== confirmation) {
      setAccountAlert(passwordAlert, 'The new passwords do not match.');
      confirmPassword?.focus();
      return;
    }

    setAccountBusy(updateButton, true);
    try {
      await updateUserPassword(current, next);
      passwordForm.reset();
      showToast('Password updated. Other sessions will need to sign in again.', 'success');
    } catch (err) {
      const message = accountErrorText(err);
      if (message) setAccountAlert(passwordAlert, message);
    } finally {
      setAccountBusy(updateButton, false);
    }
  });

  resetButton?.addEventListener('click', async () => {
    setAccountAlert(passwordAlert, '');
    const email = auth.currentUser?.email;
    if (!email) {
      setAccountAlert(passwordAlert, 'No email address is connected to this chronicle.');
      return;
    }

    setAccountBusy(resetButton, true);
    try {
      await sendPasswordReset(email);
      showToast(`Recovery link sent to ${email}.`, 'success');
    } catch (err) {
      const message = accountErrorText(err);
      if (message) setAccountAlert(passwordAlert, message);
    } finally {
      setAccountBusy(resetButton, false);
    }
  });

  [elevateEmail, elevatePassword].forEach((input) => {
    input?.addEventListener('input', () => setAccountAlert(accountAlert, ''));
  });
  [currentPassword, newPassword, confirmPassword].forEach((input) => {
    input?.addEventListener('input', () => setAccountAlert(passwordAlert, ''));
  });
}

// Initialize page reveal animation barrier
initPageReveal();

/**
 * Main entry point for the settings page.
 * NOTE: Global navigation is intentionally omitted in favor of the dedicated back button.
 */
export function initSettingsPage() {
  initAppTheme();
  loadReaderFontStylesheets();
  initSettingsInteractions();
  setupAuthDisplay();
  setupAccountSettings();
  initIcons();
  readyReveal();
  log.info('Settings page initialized successfully');
}

// Auto-boot if running in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSettingsPage());
  } else {
    initSettingsPage();
  }
}
