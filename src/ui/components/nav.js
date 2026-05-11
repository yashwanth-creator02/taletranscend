// src/ui/components/nav.js
//
// Shared navigation component injected into every page.
// Desktop: glass header with primary links + account dropdown.
// Mobile: compact top strip + bottom dock navigation.
// Also includes an accessible command palette for quick actions.
//
// Usage: call initNav() at the top of every page entry file.
// Cleanup: call destroyNav() if doing SPA-style teardown.

import { auth } from '@fb/index.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

/* ─────────────────────────────────────────────
   Config
   ───────────────────────────────────────────── */

/**
 * Universal top-level destinations. Visible to all users at all times.
 * Keep this list intentionally short — only truly global pages live here.
 */
const PRIMARY_LINKS = [
  { href: 'index.html', icon: 'home', label: 'Home' },
  { href: 'library.html', icon: 'book-open', label: 'Library' },
];

/**
 * User-contextual destinations. Surfaced inside the profile dropdown.
 */
const USER_LINKS = [
  { href: 'shelf.html', icon: 'bookmark', label: 'My Shelf' },
  { href: 'contribution.html', icon: 'feather', label: 'Write' },
  { href: 'profile.html', icon: 'user', label: 'Profile' },
];

/**
 * Command palette items that are always available.
 */
const BASE_COMMANDS = [
  { href: 'index.html', icon: 'home', label: 'Home', keywords: ['home', 'start', 'dashboard'] },
  {
    href: 'library.html',
    icon: 'book-open',
    label: 'Library',
    keywords: ['library', 'browse', 'books'],
  },
  {
    href: 'shelf.html',
    icon: 'bookmark',
    label: 'My Shelf',
    keywords: ['shelf', 'saved', 'reading list'],
  },
  {
    href: 'contribution.html',
    icon: 'feather',
    label: 'Write',
    keywords: ['write', 'create', 'story', 'draft'],
  },
  { href: 'profile.html', icon: 'user', label: 'Profile', keywords: ['profile', 'account', 'me'] },
];

/* ─────────────────────────────────────────────
   Module State
   ───────────────────────────────────────────── */

let unsubscribeAuth = null;
let listenersAttached = false;
let scrollCleanup = null;
let currentUser = null;
let commandPaletteOpen = false;

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Returns the filename of the current page (e.g. 'library.html').
 * Falls back to 'index.html' for root paths.
 *
 * @returns {string}
 */
function getCurrentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

/**
 * Safely escapes text for HTML injection.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Returns a safe avatar seed from the user UID.
 *
 * @param {Object|null} user
 * @returns {string}
 */
function getAvatarSeed(user) {
  return user?.uid ? user.uid.slice(0, 8) : 'guest';
}

/**
 * Safely calls lucide.createIcons() if available.
 *
 * @param {ParentNode} [scope=document]
 */
function renderIcons(scope = document) {
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
  try {
    window.lucide.createIcons();
  } catch {
    // No-op: icon rendering is cosmetic.
  }
}

/**
 * Returns the currently mounted nav elements.
 *
 * @returns {{
 *   nav: HTMLElement | null,
 *   user: HTMLElement | null,
 *   avatarButton: HTMLButtonElement | null,
 *   dropdown: HTMLElement | null,
 *   signOutButton: HTMLButtonElement | null,
 *   commandButton: HTMLButtonElement | null,
 *   commandPalette: HTMLElement | null,
 *   commandInput: HTMLInputElement | null,
 *   commandList: HTMLElement | null,
 *   commandCloseButton: HTMLButtonElement | null
 * }}
 */
function getNavElements() {
  return {
    nav: document.getElementById('app-nav'),
    user: document.getElementById('nav-user'),
    avatarButton: document.getElementById('avatar-btn'),
    dropdown: document.getElementById('user-dropdown'),
    signOutButton: document.getElementById('signout-btn'),
    commandButton: document.getElementById('nav-command-button'),
    commandPalette: document.getElementById('nav-command-palette'),
    commandInput: document.getElementById('nav-command-input'),
    commandList: document.getElementById('nav-command-list'),
    commandCloseButton: document.getElementById('nav-command-close'),
  };
}

/* ─────────────────────────────────────────────
   Template Builders
   ───────────────────────────────────────────── */

/**
 * Renders a single primary nav link.
 *
 * @param {{ href: string, icon: string, label: string }} link
 * @param {string} current
 * @returns {string}
 */
function buildPrimaryLink({ href, icon, label }, current) {
  const isActive = current === href;

  return `
    <a
      href="${href}"
      class="nav-link${isActive ? ' nav-link--active' : ''}"
      ${isActive ? 'aria-current="page"' : ''}
    >
      <i data-lucide="${icon}" class="nav-link__icon"></i>
      <span class="nav-link__label">${label}</span>
    </a>
  `;
}

/**
 * Renders a single item inside the user dropdown menu.
 *
 * @param {{ href: string, icon: string, label: string }} link
 * @param {string} current
 * @returns {string}
 */
function buildDropdownLink({ href, icon, label }, current) {
  const isActive = current === href;

  return `
    <a
      href="${href}"
      class="dropdown-link${isActive ? ' dropdown-link--active' : ''}"
      role="menuitem"
      ${isActive ? 'aria-current="page"' : ''}
    >
      <i data-lucide="${icon}" class="dropdown-link__icon"></i>
      <span>${label}</span>
    </a>
  `;
}

/**
 * Builds the user dropdown menu for authenticated users.
 *
 * @param {Object} user
 * @param {string} current
 * @returns {string}
 */
function buildAuthenticatedUser(user, current) {
  const seed = getAvatarSeed(user);
  const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  const displayName = escapeHtml(user.displayName || 'Your Account');
  const email = escapeHtml(user.email || '');

  const menuItems = USER_LINKS.map((link) => buildDropdownLink(link, current)).join('');

  return `
    <div class="nav-user" id="nav-user">
      <button
        class="avatar-btn"
        id="avatar-btn"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="user-dropdown"
        aria-label="Open account menu"
      >
        <img
          src="${avatarSrc}"
          alt="${displayName}"
          class="avatar-img"
        />
        <i data-lucide="chevron-down" class="avatar-chevron"></i>
      </button>

      <div
        class="dropdown"
        id="user-dropdown"
        role="menu"
        aria-labelledby="avatar-btn"
        hidden
      >
        <div class="dropdown__header">
          <img src="${avatarSrc}" alt="" class="dropdown__avatar" aria-hidden="true" />
          <div class="dropdown__identity">
            <p class="dropdown__name">${displayName}</p>
            ${email ? `<p class="dropdown__email">${email}</p>` : ''}
          </div>
        </div>

        <div class="dropdown__divider" role="separator"></div>

        <nav aria-label="Account navigation">
          ${menuItems}
        </nav>

        <div class="dropdown__divider" role="separator"></div>

        <button
          class="dropdown-link dropdown-link--danger"
          id="signout-btn"
          type="button"
          role="menuitem"
        >
          <i data-lucide="log-out" class="dropdown-link__icon"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders the guest user area for desktop.
 *
 * @returns {string}
 */
function buildGuestUser() {
  return `
    <div id="nav-user">
      <a href="profile.html" class="signin-btn">
        <i data-lucide="log-in" class="signin-btn__icon"></i>
        <span>Sign In</span>
      </a>
    </div>
  `;
}

/**
 * Renders the loading skeleton before auth resolves.
 *
 * @returns {string}
 */
function buildUserSkeleton() {
  return `
    <div id="nav-user">
      <div class="avatar-skeleton" aria-hidden="true"></div>
    </div>
  `;
}

/**
 * Builds the mobile dock item.
 *
 * @param {Object} options
 * @param {string} options.href
 * @param {string} options.icon
 * @param {string} options.label
 * @param {boolean} options.active
 * @param {boolean} [options.primary=false]
 * @returns {string}
 */
function buildDockItem({ href, icon, label, active, primary = false }) {
  return `
    <a
      href="${href}"
      class="mobile-dock__item${primary ? ' mobile-dock__item--primary' : ''}${active ? ' mobile-dock__item--active' : ''}"
      ${active ? 'aria-current="page"' : ''}
    >
      <i data-lucide="${icon}" class="mobile-dock__icon"></i>
      <span class="mobile-dock__label">${label}</span>
    </a>
  `;
}

/**
 * Builds the mobile dock.
 *
 * @param {string} current
 * @param {Object|null} user
 * @returns {string}
 */
function buildMobileDock(current, user) {
  const profileIcon = user ? 'user' : 'log-in';

  return `
    <nav class="mobile-dock" aria-label="Quick navigation">
      ${buildDockItem({
        href: 'index.html',
        icon: 'home',
        label: 'Home',
        active: current === 'index.html',
      })}
      ${buildDockItem({
        href: 'library.html',
        icon: 'book-open',
        label: 'Library',
        active: current === 'library.html',
      })}
      ${buildDockItem({
        href: 'contribution.html',
        icon: 'feather',
        label: 'Write',
        active: current === 'contribution.html',
        primary: true,
      })}
      ${buildDockItem({
        href: 'shelf.html',
        icon: 'bookmark',
        label: 'Shelf',
        active: current === 'shelf.html',
      })}
      ${buildDockItem({
        href: 'profile.html',
        icon: profileIcon,
        label: user ? 'Profile' : 'Sign In',
        active: current === 'profile.html',
      })}
    </nav>
  `;
}

/**
 * Returns a command palette item.
 *
 * @param {Object} item
 * @param {string} current
 * @returns {string}
 */
function buildCommandItem(item, current) {
  const active = item.href ? item.href === current : false;
  const hrefAttr = item.href ? `data-href="${item.href}"` : '';
  const actionAttr = item.action ? `data-action="${item.action}"` : '';

  return `
    <button
      type="button"
      class="command-item${active ? ' command-item--active' : ''}"
      role="option"
      aria-selected="${active ? 'true' : 'false'}"
      ${hrefAttr}
      ${actionAttr}
    >
      <i data-lucide="${item.icon}" class="command-item__icon"></i>
      <span class="command-item__label">${item.label}</span>
      ${item.shortcut ? `<span class="command-item__shortcut">${item.shortcut}</span>` : ''}
    </button>
  `;
}

/**
 * Builds the command palette dialog.
 *
 * @returns {string}
 */
function buildCommandPalette() {
  return `
    <div class="command-overlay" id="nav-command-palette" hidden aria-hidden="true">
      <div class="command-backdrop" data-command-close></div>

      <section
        class="command-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-command-title"
      >
        <div class="command-header">
          <div>
            <h2 id="nav-command-title" class="command-title">Quick actions</h2>
            <p class="command-subtitle">Jump anywhere with a few keys.</p>
          </div>

          <button
            type="button"
            class="command-close"
            id="nav-command-close"
            aria-label="Close command palette"
          >
            <i data-lucide="x" class="command-close__icon"></i>
          </button>
        </div>

        <div class="command-search">
          <i data-lucide="search" class="command-search__icon"></i>
          <input
            id="nav-command-input"
            class="command-input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Type to search..."
            aria-label="Search actions"
          />
        </div>

        <div class="command-list" id="nav-command-list" role="listbox" aria-label="Available actions"></div>

        <div class="command-footer">
          <span>Esc to close</span>
          <span>Ctrl/⌘ K to open</span>
        </div>
      </section>
    </div>
  `;
}

/**
 * Builds the complete nav HTML string.
 *
 * @returns {string}
 */
function buildNav() {
  const current = getCurrentPage();
  const primaryLinks = PRIMARY_LINKS.map((link) => buildPrimaryLink(link, current)).join('');

  return `
    <header id="app-nav" class="app-nav" role="banner">
      <div class="desktop-shell">
        <div class="nav-inner" role="navigation" aria-label="Main navigation">
          <a href="index.html" class="nav-logo" aria-label="TaleTranscend — Home">
            <div class="nav-logo__mark" aria-hidden="true">
              <i data-lucide="sparkles" class="nav-logo__icon"></i>
            </div>
            <span class="nav-logo__wordmark">TaleTranscend</span>
          </a>

          <div class="nav-primary" id="nav-links">
            ${primaryLinks}
          </div>

          <div class="nav-actions">
            <button
              type="button"
              class="command-trigger"
              id="nav-command-button"
              aria-label="Open command palette"
            >
              <i data-lucide="search" class="command-trigger__icon"></i>
              <span class="command-trigger__text">Search</span>
              <span class="command-trigger__hint">Ctrl K</span>
            </button>

            ${buildUserSkeleton()}
          </div>
        </div>
      </div>

      <div class="mobile-shell">
        <div class="mobile-topbar">
          <a href="index.html" class="mobile-brand" aria-label="TaleTranscend — Home">
            <div class="mobile-brand__mark" aria-hidden="true">
              <i data-lucide="sparkles" class="mobile-brand__icon"></i>
            </div>
            <span class="mobile-brand__text">TaleTranscend</span>
          </a>

          <button
            type="button"
            class="command-trigger command-trigger--mobile"
            id="nav-command-button-mobile"
            aria-label="Open command palette"
          >
            <i data-lucide="search" class="command-trigger__icon"></i>
          </button>
        </div>

        ${buildMobileDock(current, currentUser)}
      </div>

      <div class="nav-progress" aria-hidden="true"></div>

      ${buildCommandPalette()}
    </header>
  `;
}

/* ─────────────────────────────────────────────
   Styles
   ───────────────────────────────────────────── */

/**
 * Injects component-scoped CSS into <head>.
 * Idempotent: only injects once.
 */
function injectStyles() {
  if (document.getElementById('app-nav-styles')) return;

  const style = document.createElement('style');
  style.id = 'app-nav-styles';
  style.textContent = `
    :root {
      --nav-height: 64px;
      --nav-bg: rgba(8, 8, 12, 0.72);
      --nav-bg-scrolled: rgba(8, 8, 12, 0.92);
      --nav-border: rgba(255, 255, 255, 0.06);
      --nav-blur: 20px;

      --accent: #6366f1;
      --accent-muted: rgba(99, 102, 241, 0.15);
      --accent-subtle: rgba(99, 102, 241, 0.08);

      --text-primary: #f1f5f9;
      --text-secondary: #64748b;

      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;

      --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-base: 220ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-spring: 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      :root {
        --transition-fast: 0ms;
        --transition-base: 0ms;
        --transition-spring: 0ms;
      }
    }

    .app-nav {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--nav-bg);
      backdrop-filter: blur(var(--nav-blur));
      -webkit-backdrop-filter: blur(var(--nav-blur));
      border-bottom: 1px solid var(--nav-border);
      transition: background var(--transition-base), border-color var(--transition-base);
    }

    .app-nav.is-scrolled {
      background: var(--nav-bg-scrolled);
      border-color: rgba(255, 255, 255, 0.09);
      box-shadow: 0 1px 24px rgba(0, 0, 0, 0.45);
    }

    .desktop-shell {
      display: none;
    }

    .mobile-shell {
      display: block;
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 24px;
      height: var(--nav-height);
    }

    .nav-logo,
    .mobile-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      outline: none;
      border-radius: var(--radius-sm);
    }

    .nav-logo:focus-visible,
    .mobile-brand:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .nav-logo__mark,
    .mobile-brand__mark {
      width: 30px;
      height: 30px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(4deg);
      transition: transform var(--transition-spring), box-shadow var(--transition-base);
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    }

    .nav-logo:hover .nav-logo__mark,
    .mobile-brand:hover .mobile-brand__mark {
      transform: rotate(0deg) scale(1.07);
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
    }

    .nav-logo__icon,
    .mobile-brand__icon,
    .command-trigger__icon,
    .command-close__icon {
      width: 15px;
      height: 15px;
      color: #fff;
    }

    .nav-logo__wordmark,
    .mobile-brand__text {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.3px;
    }

    .nav-primary {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 12px;
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: color var(--transition-fast), background var(--transition-fast);
      outline: none;
      white-space: nowrap;
      position: relative;
    }

    .nav-link:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .nav-link:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-link--active {
      color: var(--accent);
      background: var(--accent-subtle);
    }

    .nav-link--active:hover {
      color: var(--accent);
      background: var(--accent-muted);
    }

    .nav-link--active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 25%;
      height: 50%;
      width: 2px;
      background: var(--accent);
      border-radius: 0 2px 2px 0;
    }

    .nav-link__icon {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }

    .nav-link__label {
      display: none;
    }

    .command-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary);
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
      outline: none;
    }

    .command-trigger:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.14);
    }

    .command-trigger:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .command-trigger__text {
      display: none;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .command-trigger__hint {
      display: none;
      font-size: 10px;
      color: #94a3b8;
      padding-left: 2px;
    }

    .nav-user {
      position: relative;
    }

    .avatar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 3px;
      border-radius: var(--radius-lg);
      outline: none;
      transition: background var(--transition-fast);
    }

    .avatar-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .avatar-btn:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .avatar-img {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: #1e293b;
      border: 1.5px solid rgba(255, 255, 255, 0.08);
      transition: border-color var(--transition-fast);
      display: block;
    }

    .avatar-btn:hover .avatar-img,
    .avatar-btn[aria-expanded="true"] .avatar-img {
      border-color: rgba(99, 102, 241, 0.5);
    }

    .avatar-chevron {
      width: 13px;
      height: 13px;
      color: var(--text-secondary);
      transition: transform var(--transition-base);
      display: none;
    }

    .avatar-btn[aria-expanded="true"] .avatar-chevron {
      transform: rotate(180deg);
      color: var(--text-primary);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 240px;
      background: rgba(12, 12, 18, 0.95);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-lg);
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.5),
        0 20px 60px -10px rgba(0, 0, 0, 0.7),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
      overflow: hidden;
      transform-origin: top right;
      animation: dropdown-in var(--transition-spring) both;
    }

    .dropdown.is-closing {
      animation: dropdown-out var(--transition-base) both;
    }

    @keyframes dropdown-in {
      from { opacity: 0; transform: scale(0.94) translateY(-6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes dropdown-out {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.94) translateY(-6px); }
    }

    .dropdown__header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 14px 12px;
    }

    .dropdown__avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }

    .dropdown__identity {
      min-width: 0;
    }

    .dropdown__name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    .dropdown__email {
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 2px 0 0;
    }

    .dropdown__divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 0;
    }

    .dropdown-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: color var(--transition-fast), background var(--transition-fast);
      outline: none;
    }

    .dropdown-link:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .dropdown-link:focus-visible {
      box-shadow: inset 0 0 0 2px var(--accent);
    }

    .dropdown-link--active {
      color: var(--accent);
    }

    .dropdown-link--active:hover {
      color: var(--accent);
      background: var(--accent-subtle);
    }

    .dropdown-link--danger {
      color: #f87171;
    }

    .dropdown-link--danger:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
    }

    .dropdown-link__icon {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }

    .signin-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      border-radius: var(--radius-md);
      text-decoration: none;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
      outline: none;
    }

    .signin-btn:hover {
      color: var(--text-primary);
      border-color: rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.04);
    }

    .signin-btn:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .signin-btn__icon {
      width: 14px;
      height: 14px;
    }

    .avatar-skeleton {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: #1e293b;
      animation: skeleton-pulse 1.4s ease-in-out infinite;
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }

    .mobile-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 0;
      gap: 12px;
    }

    .command-trigger--mobile {
      padding: 8px;
      border-radius: 999px;
    }

    .command-trigger--mobile .command-trigger__text,
    .command-trigger--mobile .command-trigger__hint {
      display: none;
    }

    .mobile-dock {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 49;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      padding: 10px;
      border-radius: 22px;
      background: rgba(8, 8, 12, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    }

    .mobile-dock__item {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 4px;
      border-radius: 16px;
      text-decoration: none;
      color: var(--text-secondary);
      transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
      outline: none;
    }

    .mobile-dock__item:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
      transform: translateY(-1px);
    }

    .mobile-dock__item:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .mobile-dock__item--active {
      color: var(--accent);
      background: var(--accent-subtle);
    }

    .mobile-dock__item--primary {
      color: #ffffff;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.24), rgba(139, 92, 246, 0.18));
      border: 1px solid rgba(99, 102, 241, 0.18);
      transform: translateY(-4px);
    }

    .mobile-dock__item--primary:hover {
      color: #fff;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.32), rgba(139, 92, 246, 0.24));
      transform: translateY(-6px);
    }

    .mobile-dock__icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .mobile-dock__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1;
      text-align: center;
    }

    .nav-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 1.5px;
      width: calc(var(--scroll-progress, 0) * 1%);
      background: linear-gradient(90deg, var(--accent), #a78bfa);
      transition: width 50ms linear;
      pointer-events: none;
    }

    .command-overlay {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 72px 16px 16px;
    }

    .command-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.58);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    .command-panel {
      position: relative;
      width: min(640px, 100%);
      border-radius: 28px;
      background: rgba(10, 10, 14, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.5);
      padding: 16px;
      animation: command-in var(--transition-spring) both;
    }

    @keyframes command-in {
      from { opacity: 0; transform: translateY(-12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .command-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }

    .command-title {
      margin: 0;
      font-size: 16px;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .command-subtitle {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .command-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      cursor: pointer;
      outline: none;
    }

    .command-close:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.07);
    }

    .command-close:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .command-search {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 12px;
    }

    .command-search__icon {
      width: 16px;
      height: 16px;
      color: #94a3b8;
      flex-shrink: 0;
    }

    .command-input {
      width: 100%;
      border: 0;
      outline: none;
      background: transparent;
      color: var(--text-primary);
      font-size: 14px;
    }

    .command-input::placeholder {
      color: #64748b;
    }

    .command-list {
      display: grid;
      gap: 8px;
      max-height: min(52vh, 420px);
      overflow: auto;
      padding-right: 2px;
    }

    .command-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-secondary);
      cursor: pointer;
      text-align: left;
      outline: none;
      transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
    }

    .command-item:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .command-item:focus-visible {
      box-shadow: 0 0 0 2px var(--accent);
    }

    .command-item--active {
      background: rgba(99, 102, 241, 0.1);
      color: var(--accent);
      border-color: rgba(99, 102, 241, 0.18);
    }

    .command-item__icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .command-item__label {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
    }

    .command-item__shortcut {
      font-size: 11px;
      color: #94a3b8;
      padding-left: 12px;
      white-space: nowrap;
    }

    .command-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 12px;
    }

    @media (max-width: 767px) {
      .desktop-shell {
        display: none;
      }

      .mobile-shell {
        display: block;
      }

      body {
        padding-bottom: 104px;
      }
    }

    @media (min-width: 768px) {
      .desktop-shell {
        display: block;
      }

      .mobile-shell {
        display: none;
      }

      .nav-link__label {
        display: block;
      }

      .avatar-chevron,
      .command-trigger__text,
      .command-trigger__hint {
        display: block;
      }
    }
  `;

  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────
   Command Palette
   ───────────────────────────────────────────── */

/**
 * Returns the available command palette items for the current user state.
 *
 * @param {Object|null} user
 * @returns {Array<Object>}
 */
function getCommandItems(user) {
  const commands = [...BASE_COMMANDS];

  if (user) {
    commands.push({
      action: 'signout',
      icon: 'log-out',
      label: 'Sign Out',
      keywords: ['logout', 'sign out', 'exit'],
      shortcut: '',
    });
  } else {
    commands.push({
      href: 'profile.html',
      icon: 'log-in',
      label: 'Sign In',
      keywords: ['login', 'sign in', 'account'],
      shortcut: '',
    });
  }

  return commands;
}

/**
 * Renders the command palette list based on query.
 *
 * @param {string} query
 */
function renderCommandList(query = '') {
  const { commandList } = getNavElements();
  if (!commandList) return;

  const current = getCurrentPage();
  const normalized = query.trim().toLowerCase();
  const items = getCommandItems(currentUser).filter((item) => {
    if (!normalized) return true;
    const searchable = [item.label, ...(item.keywords || [])].join(' ').toLowerCase();
    return searchable.includes(normalized);
  });

  if (!items.length) {
    commandList.innerHTML = `
      <div class="command-empty">
        No results found.
      </div>
    `;
    renderIcons(commandList);
    return;
  }

  commandList.innerHTML = items.map((item) => buildCommandItem(item, current)).join('');
  renderIcons(commandList);
}

/**
 * Opens the command palette.
 *
 * @param {boolean} [focusInput=true]
 */
function openCommandPalette(focusInput = true) {
  const { commandPalette, commandInput } = getNavElements();
  if (!commandPalette) return;

  commandPalette.hidden = false;
  commandPalette.setAttribute('aria-hidden', 'false');
  commandPaletteOpen = true;

  renderCommandList('');

  if (focusInput && commandInput) {
    window.setTimeout(() => commandInput.focus(), 0);
  }
}

/**
 * Closes the command palette.
 *
 * @param {boolean} [returnFocus=true]
 */
function closeCommandPalette(returnFocus = true) {
  const { commandPalette, commandButton } = getNavElements();
  if (!commandPalette) return;

  commandPalette.hidden = true;
  commandPalette.setAttribute('aria-hidden', 'true');
  commandPaletteOpen = false;

  if (returnFocus) {
    const trigger = commandButton || document.getElementById('nav-command-button-mobile');
    trigger?.focus?.();
  }
}

/**
 * Executes a command item.
 *
 * @param {HTMLElement} element
 */
async function executeCommand(element) {
  const href = element.getAttribute('data-href');
  const action = element.getAttribute('data-action');

  closeCommandPalette(false);

  if (href) {
    window.location.href = href;
    return;
  }

  if (action === 'signout') {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }
}

/* ─────────────────────────────────────────────
   Dropdown / Interaction Handling
   ───────────────────────────────────────────── */

/**
 * Opens the account dropdown.
 */
function openDropdown() {
  const { avatarButton, dropdown } = getNavElements();
  if (!avatarButton || !dropdown) return;

  dropdown.hidden = false;
  dropdown.classList.remove('is-closing');
  avatarButton.setAttribute('aria-expanded', 'true');
}

/**
 * Closes the account dropdown.
 *
 * @param {boolean} returnFocus
 */
function closeDropdown(returnFocus = true) {
  const { avatarButton, dropdown } = getNavElements();
  if (!avatarButton || !dropdown) return;

  if (dropdown.hidden) return;

  avatarButton.setAttribute('aria-expanded', 'false');
  dropdown.classList.add('is-closing');

  window.setTimeout(() => {
    dropdown.hidden = true;
    dropdown.classList.remove('is-closing');

    if (returnFocus) {
      avatarButton.focus();
    }
  }, 220);
}

/**
 * Toggles the account dropdown.
 */
function toggleDropdown() {
  const { avatarButton } = getNavElements();
  if (!avatarButton) return;

  const isOpen = avatarButton.getAttribute('aria-expanded') === 'true';
  if (isOpen) closeDropdown();
  else openDropdown();
}

/**
 * Global click handler for nav interactions.
 *
 * @param {MouseEvent} event
 */
function handleDocumentClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const { nav } = getNavElements();
  if (!nav) return;

  const commandOpenTarget =
    target.closest('#nav-command-button') || target.closest('#nav-command-button-mobile');
  if (commandOpenTarget) {
    event.preventDefault();
    openCommandPalette(true);
    return;
  }

  const commandCloseTarget =
    target.closest('#nav-command-close') || target.closest('[data-command-close]');
  if (commandCloseTarget) {
    event.preventDefault();
    closeCommandPalette(true);
    return;
  }

  const commandItem = target.closest('.command-item');
  if (commandItem) {
    event.preventDefault();
    executeCommand(commandItem);
    return;
  }

  const avatarTarget = target.closest('#avatar-btn');
  if (avatarTarget) {
    event.preventDefault();
    toggleDropdown();
    return;
  }

  const signOutTarget = target.closest('#signout-btn');
  if (signOutTarget) {
    event.preventDefault();
    closeDropdown(false);
    signOut(auth).catch((error) => {
      console.error('Failed to sign out:', error);
    });
    return;
  }

  const { avatarButton, dropdown } = getNavElements();
  if (dropdown && avatarButton) {
    const isOpen = avatarButton.getAttribute('aria-expanded') === 'true';
    if (isOpen && !dropdown.contains(target) && !avatarButton.contains(target)) {
      closeDropdown(false);
    }
  }

  const { commandPalette } = getNavElements();
  if (commandPalette && commandPaletteOpen) {
    const panel = commandPalette.querySelector('.command-panel');
    if (panel && !panel.contains(target)) {
      closeCommandPalette(false);
    }
  }
}

/**
 * Keyboard handler for global shortcuts.
 *
 * @param {KeyboardEvent} event
 */
function handleDocumentKeydown(event) {
  const isK = event.key.toLowerCase() === 'k';
  const cmdOrCtrl = event.metaKey || event.ctrlKey;

  if (cmdOrCtrl && isK) {
    event.preventDefault();
    if (commandPaletteOpen) closeCommandPalette(true);
    else openCommandPalette(true);
    return;
  }

  if (event.key === 'Escape') {
    if (commandPaletteOpen) {
      closeCommandPalette(true);
      return;
    }

    const { avatarButton } = getNavElements();
    if (!avatarButton) return;

    const isOpen = avatarButton.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeDropdown();
  }

  const { commandInput } = getNavElements();
  if (commandInput && commandPaletteOpen && event.key === 'Enter') {
    const firstItem = document.querySelector('.command-item');
    if (firstItem instanceof HTMLElement) {
      event.preventDefault();
      executeCommand(firstItem);
    }
  }
}

/**
 * Input handler for filtering the command palette.
 *
 * @param {Event} event
 */
function handleCommandInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  renderCommandList(target.value);
}

/* ─────────────────────────────────────────────
   Scroll Behavior
   ───────────────────────────────────────────── */

/**
 * Applies scroll-aware visual treatment to the nav.
 *
 * @returns {() => void}
 */
function initScrollBehavior() {
  const nav = document.getElementById('app-nav');
  if (!nav) return () => {};

  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    window.requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

      nav.classList.toggle('is-scrolled', scrollY > 12);
      nav.style.setProperty('--scroll-progress', progress.toFixed(2));

      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return () => window.removeEventListener('scroll', onScroll);
}

/**
 * Attaches global listeners once.
 */
function attachGlobalListeners() {
  if (listenersAttached) return;

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  const { commandInput } = getNavElements();
  if (commandInput) {
    commandInput.addEventListener('input', handleCommandInput);
  }

  scrollCleanup = initScrollBehavior();
  listenersAttached = true;
}

/**
 * Removes global listeners.
 */
function detachGlobalListeners() {
  if (!listenersAttached) return;

  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeydown);

  const { commandInput } = getNavElements();
  if (commandInput) {
    commandInput.removeEventListener('input', handleCommandInput);
  }

  if (typeof scrollCleanup === 'function') {
    scrollCleanup();
  }

  scrollCleanup = null;
  listenersAttached = false;
}

/* ─────────────────────────────────────────────
   Auth State Handling
   ───────────────────────────────────────────── */

/**
 * Replaces the auth section based on auth state.
 *
 * @param {Object|null} user
 */
function updateNavUser(user) {
  currentUser = user;

  const { nav, user: navUser } = getNavElements();
  if (!nav || !navUser) return;

  const current = getCurrentPage();
  navUser.outerHTML = user ? buildAuthenticatedUser(user, current) : buildGuestUser();

  renderIcons();

  if (commandPaletteOpen) {
    renderCommandList(document.getElementById('nav-command-input')?.value || '');
  }
}

/* ─────────────────────────────────────────────
   Lifecycle
   ───────────────────────────────────────────── */

/**
 * Injects the shared nav into the page and wires up all behavior.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initNav() {
  if (document.getElementById('app-nav')) return;

  injectStyles();
  document.body.insertAdjacentHTML('afterbegin', buildNav());
  renderIcons();

  attachGlobalListeners();

  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = null;
  }

  unsubscribeAuth = onAuthStateChanged(auth, updateNavUser);
}

/**
 * Tears down the nav and removes listeners.
 */
export function destroyNav() {
  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = null;
  }

  detachGlobalListeners();

  document.getElementById('app-nav')?.remove();
  document.getElementById('app-nav-styles')?.remove();

  currentUser = null;
  commandPaletteOpen = false;
}
