// src/pages/settings/settings.js
// Logic for Archive & Reader Codex Settings.
// Chrome-inspired settings interface with top header, sidebar navigation, and separate section panels.

import '@css/base.css';
import '@css/components.css';
import '@css/reader-themes.css';
import '@css/pages/settings.css';

import { initIcons } from '@ui/components/icons.js';
import { showToast } from '@ui/components/toast.js';
import { auth, onAuthStateChanged, refs, getDoc, setDoc, serverTimestamp } from '@fb/index.js';
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

  let targetSection = document.getElementById(normalized);
  if (!targetSection) {
    targetSection = document.getElementById('section-profile') || sections[0];
  }
  const finalId = targetSection ? targetSection.id : normalized;

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
  if (!previewBox || !previewText) return;

  previewBox.setAttribute('data-reader-theme', settings.theme);
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
          <span class="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm" style="${theme.tagStyle}">
            ${escapeHtml(theme.subtitle)}
          </span>
          <div class="app-theme-card__indicator">
            <i data-lucide="check" class="w-3.5 h-3.5 ${isActive ? '' : 'hidden'}"></i>
          </div>
        </div>
        <div class="app-theme-card__header">
          <span class="app-theme-card__title">${escapeHtml(theme.name)}</span>
          <span class="app-theme-card__sub">${theme.colorScheme}</span>
        </div>
        <p class="app-theme-card__desc">${escapeHtml(theme.description)}</p>
      </button>
    `;
  }).join('');

  initIcons(grid);
}

/**
 * Renders theme options into the settings theme grid.
 * Displays miniature manuscript specimens with genuine background, ink text sample, and mode badge.
 * @param {string} activeTheme
 */
export function renderThemes(activeTheme) {
  const grid = document.getElementById('settings-theme-grid');
  if (!grid) return;

  grid.innerHTML = READER_THEMES.map((theme) => {
    const isActive = theme.id === activeTheme;
    const isLightModeTheme = theme.mode === 'light';
    const modeBadgeText = isLightModeTheme ? 'Light' : 'Dark';

    return `
      <button
        type="button"
        class="theme-option-card${isActive ? ' active' : ''}"
        data-theme="${theme.id}"
        role="radio"
        aria-checked="${isActive ? 'true' : 'false'}"
        title="${escapeHtml(theme.label)} — ${escapeHtml(theme.sub)} (${modeBadgeText} Mode)"
      >
        <div
          class="theme-specimen"
          style="background: ${theme.bg}; color: ${theme.fg}; border-color: ${isLightModeTheme ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.12)'};"
        >
          <div class="theme-specimen__header">
            <span
              class="theme-specimen__badge"
              style="color: ${theme.fg}; background: ${isLightModeTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'};"
            >
              ${modeBadgeText}
            </span>
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
          <div class="flex items-center justify-between gap-1 w-full">
            <span class="theme-option-card__name">${escapeHtml(theme.label)}</span>
            <span class="theme-option-card__mode-tag ${isLightModeTheme ? 'theme-option-card__mode-tag--light' : 'theme-option-card__mode-tag--dark'}">
              ${modeBadgeText}
            </span>
          </div>
          <span class="theme-option-card__sub">${escapeHtml(theme.sub)}</span>
        </div>
      </button>
    `;
  }).join('');
}

/**
 * Renders available font family chips.
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
          <span class="text-xs font-bold block text-slate-100" style="font-family: ${font.css};">
            ${escapeHtml(font.label)}
          </span>
          <span class="text-[10px] text-slate-400 block">${escapeHtml(font.sub || '')}</span>
        </div>
        <i data-lucide="check" class="w-4 h-4 text-indigo-400 font-check ${isActive ? '' : 'hidden'}"></i>
      </button>
    `;
    })
    .join('');

  initIcons(container);
}

/**
 * Calculates local cache statistics.
 * @returns {{ progressCount: number, moniker: string }}
 */
export function getArchivalStats() {
  let progressCount = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('tt_progress_') || key.startsWith('tt_inquiries_'))) {
        progressCount++;
      }
    }
  } catch {
    // fallback
  }
  return {
    progressCount,
    moniker: localStorage.getItem('tt_reader_moniker') || 'None recorded',
  };
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

  // Cache Statistics & Clear
  const stats = getArchivalStats();
  const cacheStatsCount = document.getElementById('settings-cache-count');
  if (cacheStatsCount) {
    cacheStatsCount.textContent = `${stats.progressCount} Cached Items`;
  }

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
