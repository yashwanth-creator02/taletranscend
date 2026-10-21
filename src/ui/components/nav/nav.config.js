// src/ui/components/nav/nav.config.js
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
  { href: 'settings.html', icon: 'settings', label: 'Settings' },
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
    description: 'Living archive & featured chronicles',
    category: 'Lore Archives',
    keywords: ['home', 'start', 'dashboard', 'living', 'archive'],
  },
  {
    href: 'library.html',
    icon: 'book-open',
    label: 'Library',
    description: 'Explore mythic lore, sacred scrolls & folklore',
    category: 'Lore Archives',
    keywords: ['library', 'browse', 'books', 'tales', 'folklore', 'myths'],
  },
  {
    href: 'shelf.html',
    icon: 'bookmark',
    label: 'My Shelf',
    description: 'Saved stories, bookmarks & reading list',
    category: 'Scribe Sanctuary',
    keywords: ['shelf', 'saved', 'reading list', 'bookmarks', 'library'],
  },
  {
    href: 'contribution.html',
    icon: 'feather',
    label: 'Write',
    description: 'Inscribe and contribute a new mythic story',
    category: 'Scribe Sanctuary',
    keywords: ['write', 'create', 'story', 'draft', 'contribute', 'inscribe'],
  },
  {
    href: 'profile.html',
    icon: 'user',
    label: 'Profile',
    description: 'Your scribe rank, legacy & reading history',
    category: 'Scribe Sanctuary',
    keywords: ['profile', 'account', 'me', 'legacy', 'rank'],
  },
  {
    href: 'settings.html',
    icon: 'settings',
    label: 'Settings',
    description: 'Configure appearance, typography & archival preferences',
    category: 'System & Preferences',
    keywords: ['settings', 'preferences', 'theme', 'font', 'appearance', 'options'],
  },
  {
    action: 'theme:transcendental',
    icon: 'sparkles',
    label: 'Theme: Transcendental',
    description: 'Signature cosmic dark with obsidian depth & amber runes',
    category: 'Appearance & Theme',
    keywords: ['theme', 'dark', 'transcendental', 'cosmic', 'appearance', 'mode'],
  },
  {
    action: 'theme:dark',
    icon: 'moon',
    label: 'Theme: Midnight Dark',
    description: 'Charcoal obsidian depths with luminous indigo accents',
    category: 'Appearance & Theme',
    keywords: ['theme', 'dark', 'midnight', 'indigo', 'appearance', 'mode'],
  },
  {
    action: 'theme:light',
    icon: 'sun',
    label: 'Theme: Illuminated Light',
    description: 'Warm manuscript parchment base with crisp royal ink',
    category: 'Appearance & Theme',
    keywords: ['theme', 'light', 'parchment', 'day', 'appearance', 'mode'],
  },
  {
    action: 'theme:system',
    icon: 'monitor',
    label: 'Theme: Sync with System',
    description: 'Automatically match device dark or light appearance',
    category: 'Appearance & Theme',
    keywords: ['theme', 'system', 'auto', 'device', 'match', 'appearance', 'mode'],
  },
];

/**
 * Mobile dock items — the three always-available destinations. Write remains a
 * desktop primary link and palette command; Profile is the header avatar.
 *
 * @type {Array<{ href: string, icon: string, label: string }>}
 */
export const DOCK_ITEMS = [
  { href: 'index.html', icon: 'home', label: 'Home' },
  { href: 'library.html', icon: 'book-open', label: 'Library' },
  { href: 'shelf.html', icon: 'bookmark', label: 'Shelf' },
];
