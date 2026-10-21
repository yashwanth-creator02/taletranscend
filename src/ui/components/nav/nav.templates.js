// src/ui/components/nav/nav.templates.js
//
// Pure HTML string builders for every structural piece of the navigation.
// No DOM mutation happens here — all functions return strings.
// Keeping templates separate from behaviour makes both independently testable.

import { PRIMARY_LINKS, DOCK_ITEMS } from './nav.config.js';
import { getCurrentPage, escapeHtml, getAvatarSeed } from './nav.utils.js';
import { resolveHref } from '@/utils';

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
  const targetHref = resolveHref(href);
  const isActive = current === href || current === targetHref || targetHref === `/${current}`;
  return `
    <a
      href="${targetHref}"
      class="nav-link${isActive ? ' nav-link--active' : ''}"
      aria-label="${label}"
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
  const targetHref = resolveHref(href);
  const isActive = current === href || current === targetHref || targetHref === `/${current}`;
  return `
    <a
      href="${targetHref}"
      class="dropdown-link${isActive ? ' dropdown-link--active' : ''}"
      role="menuitem"
      aria-label="${label}"
      tabindex="-1"
      ${isActive ? 'aria-current="page"' : ''}
    >
      <i data-lucide="${icon}" class="dropdown-link__icon" aria-hidden="true"></i>
      <span>${label}</span>
    </a>
  `;
}

/**
 * Builds the desktop user area: the avatar rendered as a direct link to the
 * user's profile page (the account menu itself now lives on the brand mark).
 *
 * @param {import('firebase/auth').User} user
 * @returns {string}
 */
export function buildAuthenticatedUser(user) {
  const seed = getAvatarSeed(user);
  const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  const displayName = escapeHtml(user.displayName || 'Your Account');

  return `
    <div class="nav-user" id="nav-user">
      <a
        class="nav-avatar"
        id="nav-profile-link"
        href="${resolveHref('profile.html')}"
        aria-label="Open profile for ${displayName}"
        title="Profile"
      >
        <img
          src="${avatarSrc}"
          alt=""
          class="avatar-img"
          width="32"
          height="32"
        />
      </a>
    </div>
  `;
}

/**
 * Builds the brand slot at the header's left edge: the logo mark, and — for a
 * signed-in user — the account menu trigger plus its dropdown panel.
 *
 * Guest: the mark stays a plain link to the home page (no account menu exists).
 * Member: the mark becomes a button that opens the account dropdown anchored
 * beneath it; hovering/focusing the mark swaps the logo for a menu glyph so
 * the affordance is visible before the first click.
 *
 * @param {import('firebase/auth').User | null} user
 * @param {string} current
 * @param {Array<{ href: string, icon: string, label: string }>} userLinks
 * @returns {string}
 */
export function buildBrandMark(user, current, userLinks) {
  const logoImg = `
    <img
      src="${resolveHref('/logo.png')}"
      alt=""
      class="nav-logo__img"
      aria-hidden="true"
      width="28"
      height="28"
    />
  `;

  if (!user) {
    return `
      <a href="${resolveHref('index.html')}" class="nav-logo__mark" aria-label="TaleTranscend home">
        ${logoImg}
      </a>
    `;
  }

  const displayName = escapeHtml(user.displayName || 'Your Account');

  return `
    <button
      type="button"
      class="nav-logo__mark nav-logo__mark--menu"
      id="nav-menu-btn"
      aria-haspopup="menu"
      aria-expanded="false"
      aria-controls="user-dropdown"
      aria-label="Open account menu for ${displayName}"
    >
      ${logoImg}
      <i data-lucide="menu" class="nav-logo__menu-icon" aria-hidden="true"></i>
    </button>

    ${buildAccountMenu(user, current, userLinks)}
  `;
}

/**
 * Builds the account dropdown panel: identity header, user links, optional
 * Secure Account CTA (anonymous users), and sign out.
 *
 * @param {import('firebase/auth').User} user
 * @param {string} current
 * @param {Array<{ href: string, icon: string, label: string }>} userLinks
 * @returns {string}
 */
export function buildAccountMenu(user, current, userLinks) {
  const seed = getAvatarSeed(user);
  const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  const displayName = escapeHtml(user.displayName || 'Your Account');
  const email = escapeHtml(user.email || '');
  const menuItems = userLinks.map((link) => buildDropdownLink(link, current)).join('');
  const isAnonymous = user.isAnonymous;

  return `
    <div
      class="dropdown"
      id="user-dropdown"
      role="menu"
      aria-labelledby="nav-menu-btn"
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
        ${
          isAnonymous
            ? `
          <div class="dropdown__divider" role="separator"></div>
          <button
            class="dropdown-link dropdown-link--primary"
            id="nav-upgrade-btn"
            type="button"
            role="menuitem"
            aria-label="Secure Account with Google"
            tabindex="-1"
          >
            <i data-lucide="shield-check" class="dropdown-link__icon" aria-hidden="true"></i>
            <span>Secure Account</span>
          </button>
        `
            : ''
        }
      </nav>

      <div class="dropdown__divider" role="separator"></div>

      <button
        class="dropdown-link dropdown-link--danger"
        id="signout-btn"
        type="button"
        role="menuitem"
        aria-label="Sign out of account"
        tabindex="-1"
      >
        <i data-lucide="log-out" class="dropdown-link__icon" aria-hidden="true"></i>
        <span>Sign Out</span>
      </button>
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
      <a href="${resolveHref('login.html')}" class="signin-btn">
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
 * @param {{ href: string, icon: string, label: string, active: boolean }} options
 * @returns {string}
 */
export function buildDockItem({ href, icon, label, active }) {
  const targetHref = resolveHref(href);
  return `
    <a
      href="${targetHref}"
      class="mobile-dock__item${active ? ' mobile-dock__item--active' : ''}"
      aria-label="${label}"
      ${active ? 'aria-current="page"' : ''}
    >
      <div class="mobile-dock__icon-wrap">
        <i data-lucide="${icon}" class="mobile-dock__icon" aria-hidden="true"></i>
      </div>
      <span class="mobile-dock__label">${label}</span>
    </a>
  `;
}

/**
 * Builds the full mobile bottom dock navigation.
 *
 * The dock is intentionally auth-independent: Home, Library, and Shelf are the
 * only destinations, so a user change never needs to rebuild its contents.
 *
 * @param {string} current - Current page filename
 * @returns {string}
 */
export function buildMobileDock(current) {
  const dockItems = DOCK_ITEMS.map((item) =>
    buildDockItem({ ...item, active: current === item.href })
  ).join('');

  return `
    <nav class="mobile-dock" aria-label="Quick navigation">
      ${dockItems}
    </nav>
  `;
}

/* ─────────────────────────────────────────────
   Notifications Template
   ───────────────────────────────────────────── */

/**
 * Builds the floating notifications trigger and its drawer.
 *
 * Mounted as a direct child of <body> (not inside the header) because
 * `.app-nav` uses backdrop-filter, which would otherwise trap the
 * viewport-fixed positioning of the floating trigger.
 *
 * The trigger starts hidden — `updateNotificationBadge` /
 * `updatePinnedCount` reveal it once unread or pinned notices exist.
 *
 * @returns {string}
 */
export function buildNotifications() {
  return `
    <div id="nav-notifications-container" class="nav-notifications-float is-hidden">
      <button
        type="button"
        class="nav-icon-btn nav-notifications-trigger"
        id="nav-notifications-btn"
        title="Chronicle Notices"
        aria-label="Chronicle Notices"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="nav-notifications-popover"
      >
        <i data-lucide="bell" class="w-4 h-4" aria-hidden="true"></i>
        <span id="nav-notifications-badge" class="nav-notifications-badge hidden"></span>
      </button>
      <div
        id="nav-notifications-popover"
        class="nav-notifications-popover hidden"
        role="dialog"
        aria-label="Notifications"
      >
        <div class="nav-notifications-popover__header">
          <div class="nav-notifications-popover__title-wrap">
            <i data-lucide="bell" class="nav-notifications-popover__icon" aria-hidden="true"></i>
            <h3 class="nav-notifications-popover__title">Chronicle Notices</h3>
          </div>
          <button
            type="button"
            id="nav-notifications-mark-read"
            class="nav-notifications-popover__mark-read"
          >
            Mark read
          </button>
        </div>
        <div id="nav-notifications-list" class="nav-notifications-list">
          <div class="nav-notifications-empty">No notices in the archive</div>
        </div>
      </div>
    </div>
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
export function buildCommandItem(item, current, isFocused = false, index = 0) {
  const isActive = item.href ? item.href === current : false;
  const hrefAttr = item.href ? `data-href="${item.href}"` : '';
  const actionAttr = item.action ? `data-action="${item.action}"` : '';

  let classes = 'command-item';
  if (isActive) classes += ' command-item--active';
  if (isFocused) classes += ' is-focused';

  return `
    <button
      type="button"
      id="command-item-${index}"
      class="${classes}"
      role="option"
      aria-selected="${isFocused ? 'true' : 'false'}"
      ${hrefAttr}
      ${actionAttr}
      tabindex="-1"
    >
      <span class="command-item__icon-wrap" aria-hidden="true">
        <i data-lucide="${item.icon}" class="command-item__icon"></i>
      </span>
      <span class="command-item__content">
        <span class="command-item__label">${escapeHtml(item.label)}</span>
        ${item.description ? `<span class="command-item__desc">${escapeHtml(item.description)}</span>` : ''}
      </span>
      ${item.shortcut ? `<span class="command-item__shortcut" aria-label="Shortcut: ${item.shortcut}">${item.shortcut}</span>` : ''}
      ${isActive ? '<span class="command-item__badge">Current</span>' : ''}
      <span class="command-item__arrow" aria-hidden="true">
        <i data-lucide="arrow-right" class="command-item__arrow-icon"></i>
      </span>
    </button>
  `;
}

/**
 * Builds the command palette shell in a lookup layout: the search field is the
 * first row and visual anchor (with the inline close control), followed by the
 * results list and a keyboard-hint footer. The list is populated dynamically
 * by command-palette.js. The h2 is visually hidden and exists purely to name
 * the dialog for assistive technology.
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
        <h2 id="nav-command-title" class="command-title">Quick tools</h2>

        <div class="command-search" role="search">
          <div class="command-search__icon-wrap" aria-hidden="true">
            <i data-lucide="look-up" class="command-search__icon"></i>
          </div>
          <input
            id="nav-command-input"
            class="command-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            autocomplete="off"
            spellcheck="false"
            placeholder="Look up a page, theme, or action…"
            aria-label="Look up pages, themes, and actions"
            aria-autocomplete="list"
            aria-controls="nav-command-list"
          />
          <button
            type="button"
            class="command-search__clear"
            id="nav-command-clear"
            aria-label="Clear look-up query"
            tabindex="-1"
            hidden
          >
            <i data-lucide="x" class="command-search__clear-icon" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="command-close"
            id="nav-command-close"
            aria-label="Close quick tools (Escape)"
          >
            <span class="command-close__kbd" aria-hidden="true">Esc</span>
            <i data-lucide="x" class="command-close__icon" aria-hidden="true"></i>
          </button>
        </div>

        <div
          class="command-list"
          id="nav-command-list"
          role="listbox"
          aria-label="Available pages and actions"
        ></div>

        <div class="command-footer" aria-hidden="true">
          <div class="command-footer__hints">
            <span class="command-footer__hint">
              <kbd>↑</kbd><kbd>↓</kbd> <span>Navigate</span>
            </span>
            <span class="command-footer__hint">
              <kbd>↵</kbd> <span>Select</span>
            </span>
            <span class="command-footer__hint">
              <kbd>Esc</kbd> <span>Close</span>
            </span>
          </div>
          <div class="command-footer__brand">
            <i data-lucide="sparkles" class="command-footer__brand-icon"></i>
            <span>TaleTranscend</span>
          </div>
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
          <div class="nav-brand-group">
            <div class="nav-brand">
              <div class="nav-brand__anchor" id="nav-brand-anchor">
                ${buildBrandMark(null)}
              </div>
              <a href="${resolveHref('index.html')}" class="nav-logo__wordmark">TaleTranscend</a>
            </div>

            <nav class="nav-primary desktop-shell" aria-label="Primary navigation">
              ${primaryLinks}
            </nav>
          </div>

          <div class="nav-actions">
            <button
              type="button"
              class="command-trigger desktop-shell"
              id="nav-command-button"
              aria-label="Search pages and actions (Ctrl+K)"
              aria-haspopup="dialog"
              aria-expanded="false"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <i data-lucide="look-up" class="w-4 h-4" aria-hidden="true"></i>
              <span class="text-xs font-semibold uppercase tracking-wider">Search</span>
              <kbd class="command-trigger__hint" aria-hidden="true">⌘K</kbd>
            </button>

            <button
              type="button"
              class="command-trigger mobile-shell"
              id="nav-command-button-mobile"
              aria-label="Search pages and actions"
              aria-haspopup="dialog"
              aria-expanded="false"
            >
              <i data-lucide="look-up" class="w-4 h-4" aria-hidden="true"></i>
            </button>

            <!-- Notifications live in a floating trigger below the nav bar.
                 Settings stays reachable from the account menu on the brand
                 mark and from the command palette. -->

            <div id="nav-user" class="flex items-center">
              ${buildUserSkeleton()}
            </div>
          </div>
        </div>

        <div class="nav-progress"></div>
      </header>
    `,
    dockHtml: `
      <div id="mobile-dock-container">
        ${buildMobileDock(current)}
      </div>
    `,
    alertsHtml: buildNotifications(),
    paletteHtml: buildCommandPalette(),
  };
}
