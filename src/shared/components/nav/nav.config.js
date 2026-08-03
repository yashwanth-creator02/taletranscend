// src/shared/nav/nav.config.js
//
// Centralised configuration for all navigation links and command palette items.
// Keeps data separate from rendering so both are independently maintainable.

/**
 * Top-level destinations always visible in the desktop header.
 * Keep this deliberately short — only truly global pages live here.
 *
 * @type {Array<{ href: string, icon: string, label: string }>}
 */
export const PRIMARY_LINKS = [
  { href: 'index.html', icon: 'home', label: 'Home' },
  { href: 'library.html', icon: 'book-open', label: 'Library' },
];

/**
 * User-contextual destinations surfaced inside the profile dropdown.
 * These require an authenticated session to be meaningful.
 *
 * @type {Array<{ href: string, icon: string, label: string }>}
 */
export const USER_LINKS = [
  { href: 'shelf.html', icon: 'bookmark', label: 'My Shelf' },
  { href: 'contribution.html', icon: 'feather', label: 'Write' },
  { href: 'profile.html', icon: 'user', label: 'Profile' },
];

/**
 * The fixed set of commands available to every user regardless of auth state.
 * Auth-sensitive commands (Sign In / Sign Out) are added dynamically in
 * `getCommandItems()` inside command-palette.js.
 *
 * @type {Array<{ href?: string, action?: string, icon: string, label: string, keywords: string[], shortcut?: string }>}
 */
export const BASE_COMMANDS = [
  {
    href: 'index.html',
    icon: 'home',
    label: 'Home',
    keywords: ['home', 'start', 'dashboard'],
  },
  {
    href: 'library.html',
    icon: 'book-open',
    label: 'Library',
    keywords: ['library', 'browse', 'books', 'tales'],
  },
  {
    href: 'shelf.html',
    icon: 'bookmark',
    label: 'My Shelf',
    keywords: ['shelf', 'saved', 'reading list', 'bookmarks'],
  },
  {
    href: 'contribution.html',
    icon: 'feather',
    label: 'Write',
    keywords: ['write', 'create', 'story', 'draft', 'contribute'],
  },
  {
    href: 'profile.html',
    icon: 'user',
    label: 'Profile',
    keywords: ['profile', 'account', 'me', 'settings'],
  },
];

/**
 * Mobile dock items. Primary marks the elevated CTA item.
 *
 * @type {Array<{ href: string, icon: string, label: string, primary?: boolean }>}
 */
export const DOCK_ITEMS = [
  { href: 'index.html', icon: 'home', label: 'Home' },
  { href: 'library.html', icon: 'book-open', label: 'Library' },
  { href: 'contribution.html', icon: 'feather', label: 'Write', primary: true },
  { href: 'shelf.html', icon: 'bookmark', label: 'Shelf' },
  // Profile dock item is built dynamically to reflect auth state — see nav.templates.js
];
