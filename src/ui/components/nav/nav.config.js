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
 * Staff-only destinations. Appended to USER_LINKS only after the ID token
 * reports an admin or moderator custom claim. Authors reach the same page
 * through their profile; ordinary users never see the entry.
 *
 * @type {Array<{ href: string, icon: string, label: string }>}
 */
export const STAFF_LINKS = [{ href: 'admin.html', icon: 'shield', label: 'Control Room' }];

/**
 * The fixed set of commands available to every user regardless of auth state.
 * Auth-sensitive commands (Sign In / Sign Out) are added dynamically in
 * `getCommandItems()` inside command-palette.js.
 *
 * @type {Array<{ href?: string, action?: string, icon: string, label: string, description: string, category: string, keywords: string[], shortcut?: string }>}
 */
export const BASE_COMMANDS = [
  {
    href: 'index.html',
    icon: 'home',
    label: 'Home',
    description: 'Featured chronicles & recent tales',
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
    href: 'toc.html',
    icon: 'list',
    label: 'Table of Contents',
    description: 'Every preserved chronicle, organized by era & culture',
    category: 'Lore Archives',
    keywords: ['table of contents', 'toc', 'contents', 'index', 'archive', 'chronicles'],
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
    href: 'settings.html#general',
    icon: 'sliders-horizontal',
    label: 'General & Theme',
    description: 'Interface theme, Google API Key & system defaults',
    category: 'System & Preferences',
    keywords: [
      'settings',
      'general',
      'theme',
      'appearance',
      'google',
      'gemini',
      'api key',
      'reset',
      'defaults',
    ],
  },
  {
    href: 'settings.html#reader',
    icon: 'book-open',
    label: 'Reader',
    description: 'Reading themes, typography & live preview',
    category: 'System & Preferences',
    keywords: [
      'settings',
      'reader',
      'reading',
      'font',
      'typography',
      'line height',
      'measure',
      'preview',
    ],
  },
  {
    href: 'settings.html#atmosphere',
    icon: 'sparkles',
    label: 'Atmosphere & Motion',
    description: 'Particles, ambient sound & reduced motion',
    category: 'System & Preferences',
    keywords: [
      'settings',
      'atmosphere',
      'particles',
      'sound',
      'audio',
      'motion',
      'animation',
      'reduced motion',
    ],
  },
  {
    href: 'settings.html#storage',
    icon: 'database',
    label: 'Archival Storage',
    description: 'Cached reading state & inquiry records',
    category: 'System & Preferences',
    keywords: ['settings', 'storage', 'cache', 'cached', 'offline', 'archive', 'records', 'local'],
  },
  {
    href: 'settings.html#accounts',
    icon: 'shield-check',
    label: 'Accounts',
    description: 'Email, password, guest elevation & cloud saving',
    category: 'System & Preferences',
    keywords: [
      'settings',
      'account',
      'accounts',
      'email',
      'password',
      'guest',
      'upgrade',
      'sign in',
      'login',
      'cloud',
      'sync',
      'security',
    ],
  },
  {
    href: 'settings.html#about',
    icon: 'info',
    label: 'About TaleTranscend',
    description: 'Architecture, engine & archive details',
    category: 'System & Preferences',
    keywords: ['settings', 'about', 'architecture', 'engine', 'firebase', 'vite', 'design tokens'],
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
