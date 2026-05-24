// src/ui/components/nav/nav.templates.js
//
// Pure HTML string builders for every structural piece of the navigation.
// No DOM mutation happens here — all functions return strings.
// Keeping templates separate from behaviour makes both independently testable.

import { PRIMARY_LINKS, DOCK_ITEMS } from './nav.config.js';
import { getCurrentPage, escapeHtml, getAvatarSeed } from './nav.utils.js';

/* ─────────────────────────────────────────────
   Desktop Header Templates
   ───────────────────────────────────────────── */

/**
 * Renders a single primary nav link with active-state decoration.
 *
 * @param {{ href: string, icon: string, label: string }} link
 * @param {string} current - Current page filename
 * @returns {string}
 */
export function buildPrimaryLink({ href, icon, label }, current) {
  const isActive = current === href;
  return `
    <a
      href="${href}"
      class="nav-link${isActive ? ' nav-link--active' : ''}"
      ${isActive ? 'aria-current="page"' : ''}
    >
      <i data-lucide="${icon}" class="nav-link__icon" aria-hidden="true"></i>
      <span class="nav-link__label">${label}</span>
    </a>
  `;
}

/**
 * Renders a single item inside the authenticated user dropdown menu.
 *
 * @param {{ href: string, icon: string, label: string }} link
 * @param {string} current
 * @returns {string}
 */
export function buildDropdownLink({ href, icon, label }, current) {
  const isActive = current === href;
  return `
    <a
      href="${href}"
      class="dropdown-link${isActive ? ' dropdown-link--active' : ''}"
      role="menuitem"
      ${isActive ? 'aria-current="page"' : ''}
    >
      <i data-lucide="${icon}" class="dropdown-link__icon" aria-hidden="true"></i>
      <span>${label}</span>
    </a>
  `;
}

/**
 * Builds the full authenticated user area: avatar button + dropdown panel.
 *
 * @param {import('firebase/auth').User} user
 * @param {string} current
 * @param {Array<{ href: string, icon: string, label: string }>} userLinks
 * @returns {string}
 */
export function buildAuthenticatedUser(user, current, userLinks) {
  const seed = getAvatarSeed(user);
  const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  const displayName = escapeHtml(user.displayName || 'Your Account');
  const email = escapeHtml(user.email || '');

  const menuItems = userLinks.map((link) => buildDropdownLink(link, current)).join('');

  return `
    <div class="nav-user" id="nav-user">
      <button
        class="avatar-btn"
        id="avatar-btn"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="user-dropdown"
        aria-label="Open account menu for ${displayName}"
      >
        <img
          src="${avatarSrc}"
          alt="${displayName}"
          class="avatar-img"
          width="32"
          height="32"
        />
        <i data-lucide="chevron-down" class="avatar-chevron" aria-hidden="true"></i>
      </button>

      <div
        class="dropdown"
        id="user-dropdown"
        role="menu"
        aria-labelledby="avatar-btn"
        hidden
      >
        <div class="dropdown__header">
          <img
            src="${avatarSrc}"
            alt=""
            class="dropdown__avatar"
            aria-hidden="true"
            width="36"
            height="36"
          />
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
          <i data-lucide="log-out" class="dropdown-link__icon" aria-hidden="true"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders the guest user area (Sign In CTA) for the desktop header.
 *
 * @returns {string}
 */
export function buildGuestUser() {
  return `
    <div id="nav-user">
      <a href="profile.html" class="signin-btn">
        <i data-lucide="log-in" class="signin-btn__icon" aria-hidden="true"></i>
        <span>Sign In</span>
      </a>
    </div>
  `;
}

/**
 * Renders a loading skeleton displayed while Firebase auth resolves.
 *
 * @returns {string}
 */
export function buildUserSkeleton() {
  return `
    <div id="nav-user" aria-hidden="true">
      <div class="avatar-skeleton"></div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Mobile Templates
   ───────────────────────────────────────────── */

/**
 * Builds a single mobile dock tab item.
 *
 * @param {{ href: string, icon: string, label: string, active: boolean, primary?: boolean }} options
 * @returns {string}
 */
export function buildDockItem({ href, icon, label, active, primary = false }) {
  return `
    <a
      href="${href}"
      class="mobile-dock__item${primary ? ' mobile-dock__item--primary' : ''}${active ? ' mobile-dock__item--active' : ''}"
      ${active ? 'aria-current="page"' : ''}
    >
      <i data-lucide="${icon}" class="mobile-dock__icon" aria-hidden="true"></i>
      <span class="mobile-dock__label">${label}</span>
    </a>
  `;
}

/**
 * Builds the full mobile bottom dock navigation.
 *
 * @param {string} current - Current page filename
 * @param {import('firebase/auth').User | null} user
 * @returns {string}
 */
export function buildMobileDock(current, user) {
  const profileIcon = user ? 'user' : 'log-in';
  const profileLabel = user ? 'Profile' : 'Sign In';

  const dockItems = DOCK_ITEMS.map((item) =>
    buildDockItem({ ...item, active: current === item.href })
  ).join('');

  const profileItem = buildDockItem({
    href: 'profile.html',
    icon: profileIcon,
    label: profileLabel,
    active: current === 'profile.html',
  });

  return `
    <nav class="mobile-dock" aria-label="Quick navigation">
      ${dockItems}
      ${profileItem}
    </nav>
  `;
}

/* ─────────────────────────────────────────────
   Command Palette Template
   ───────────────────────────────────────────── */

/**
 * Builds a single command palette item button.
 *
 * @param {{ href?: string, action?: string, icon: string, label: string, shortcut?: string }} item
 * @param {string} current
 * @returns {string}
 */
export function buildCommandItem(item, current) {
  const isActive = item.href ? item.href === current : false;
  const hrefAttr = item.href ? `data-href="${item.href}"` : '';
  const actionAttr = item.action ? `data-action="${item.action}"` : '';

  return `
    <button
      type="button"
      class="command-item${isActive ? ' command-item--active' : ''}"
      role="option"
      aria-selected="${isActive ? 'true' : 'false'}"
      ${hrefAttr}
      ${actionAttr}
    >
      <span class="command-item__icon-wrap" aria-hidden="true">
        <i data-lucide="${item.icon}" class="command-item__icon"></i>
      </span>
      <span class="command-item__label">${item.label}</span>
      ${item.shortcut ? `<span class="command-item__shortcut" aria-label="Shortcut: ${item.shortcut}">${item.shortcut}</span>` : ''}
      ${isActive ? '<span class="command-item__badge">Current page</span>' : ''}
    </button>
  `;
}

/**
 * Builds the command palette dialog shell (input + list container + footer).
 * The list is populated dynamically by command-palette.js.
 *
 * @returns {string}
 */
export function buildCommandPalette() {
  return `
    <div
      class="command-overlay"
      id="nav-command-palette"
      hidden
      aria-hidden="true"
      role="presentation"
    >
      <div class="command-backdrop" data-command-close aria-hidden="true"></div>

      <section
        class="command-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-command-title"
      >
        <div class="command-header">
          <div class="command-header__text">
            <h2 id="nav-command-title" class="command-title">Quick Navigation</h2>
            <p class="command-subtitle">Jump anywhere — type or use arrow keys.</p>
          </div>

          <button
            type="button"
            class="command-close"
            id="nav-command-close"
            aria-label="Close command palette"
          >
            <i data-lucide="x" class="command-close__icon" aria-hidden="true"></i>
          </button>
        </div>

        <div class="command-search" role="search">
          <i data-lucide="search" class="command-search__icon" aria-hidden="true"></i>
          <input
            id="nav-command-input"
            class="command-input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            aria-autocomplete="list"
            aria-controls="nav-command-list"
          />
        </div>

        <div
          class="command-list"
          id="nav-command-list"
          role="listbox"
          aria-label="Available pages and actions"
        ></div>

        <div class="command-footer" aria-hidden="true">
          <span class="command-footer__hint">
            <kbd>↑</kbd><kbd>↓</kbd> Navigate
          </span>
          <span class="command-footer__hint">
            <kbd>↵</kbd> Select
          </span>
          <span class="command-footer__hint">
            <kbd>Esc</kbd> Close
          </span>
          <span class="command-footer__hint">
            <kbd>⌘K</kbd> Toggle
          </span>
        </div>
      </section>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Root Nav Shell
   ───────────────────────────────────────────── */

/**
 * Assembles the complete nav HTML string injected into <body>.
 * Auth-dependent sections start with skeleton/guest placeholders;
 * they are swapped out once Firebase resolves.
 *
 * @returns {string}
 */

export function buildNav() {
  const current = getCurrentPage();
  const primaryLinks = PRIMARY_LINKS.map((link) => buildPrimaryLink(link, current)).join('');

  return {
    headerHtml: `
      <header id="app-nav" class="app-nav">
        <div class="nav-inner">
          <div class="flex items-center gap-10">
            <a href="index.html" class="nav-logo">
              <div class="nav-logo__mark">
                <i data-lucide="sparkles" class="nav-logo__icon"></i>
              </div>
              <span class="nav-logo__wordmark">TaleTranscend</span>
            </a>

            <nav class="nav-primary desktop-shell">
              ${primaryLinks}
            </nav>
          </div>

          <div class="nav-actions">
            <button type="button" class="command-trigger desktop-shell" id="nav-command-button">
              <i data-lucide="search" class="w-4 h-4"></i>
              <span class="text-xs font-bold uppercase tracking-widest">Search</span>
              <kbd class="command-trigger__hint">⌘K</kbd>
            </button>

            <button type="button" class="command-trigger mobile-shell p-3 rounded-xl bg-white/5 border border-white/10" id="nav-command-button-mobile">
              <i data-lucide="search" class="w-4 h-4"></i>
            </button>

            <div id="nav-user" class="flex items-center">
              ${buildUserSkeleton()}
            </div>
          </div>
        </div>

        <div class="nav-progress"></div>
        ${buildCommandPalette()}
      </header>
    `,
    dockHtml: `
      <div id="mobile-dock-container">
        ${buildMobileDock(current, null)}
      </div>
    `,
  };
}
