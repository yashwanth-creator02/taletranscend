# Directive: Navigation, Hierarchical Routing, and Sitemaps

## Goal

Define and enforce standards for URL structure, deep-path route resolution, client-side navigation safety, and automated XML/HTML sitemap discovery across TaleTranscend.

## When this fires

- Adding or updating internal links, navigation bars, docks, or router utilities.
- Creating or editing deep routes under `/tales/` or `/tales/:id/read/:chapter`.
- Modifying `src/utils/navigation.ts`, `vite.config.js`, or `firebase.json` routing configurations.
- Regenerating or indexing sitemaps (`public/sitemap.xml`, `src/views/toc.html`).

## Inputs

- Navigation utility: `src/utils/navigation.ts`.
- Routing configuration: `firebase.json`, `vite.config.js`.
- Template builders: `src/ui/components/nav/nav.templates.js`.
- Sitemap assets: `public/sitemap.xml`, `src/views/toc.html`, `src/pages/toc/`.

## Git Safety (If Modifying Code)

- Always create a dedicated feature or bugfix branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` strictly require explicit user approval in the conversation.

## Architectural Principles & Rules

### 1. Hierarchical Clean URL Scheme

TaleTranscend enforces human-readable, canonical hierarchical URLs:

- Tale detail: `/tales/{taleId}` (rewritten to `/tale.html?id={taleId}`)
- Reader chapter: `/tales/{taleId}/read/{chapterIndex}` (rewritten to `/reader.html?id={taleId}&ch={chapterIndex}`)
- Living Codex / Table of Contents: `/toc` (rewritten to `/toc.html`)
- All tale URLs must be generated via centralized helpers `taleUrl(id)` and `readerUrl(id, chapter)` in `src/utils/navigation.ts`. Never construct ad-hoc string templates in page code.

### 2. Dual-Environment Route Parity (Vite + Firebase)

Both local development and production hosting must handle identical clean URLs without 404s:

- **Firebase Hosting**: Managed via rewrites in `firebase.json`:
  - `{"source": "/tales/**/read/**", "destination": "/reader.html"}`
  - `{"source": "/tales/**", "destination": "/tale.html"}`
  - `{"source": "/toc", "destination": "/toc.html"}`
- **Vite Dev Server**: Managed via `hierarchicalRoutesPlugin` in `vite.config.js`, ensuring middleware rewrites deep request paths before Vite resolves files against `src/views`.

### 3. Deep-Path Navigation Trap & `resolveHref` Rule

In an MPA served at deep hierarchical paths (such as `/tales/tale-007`), bare relative paths (e.g. `href="library.html"`) resolve relative to the current virtual directory (`/tales/library.html`), causing 404 errors.

- **Rule**: All internal navigation links, template URLs, and redirects MUST pass through `resolveHref()` from `@/utils`.
- **Root-Relative Normalization**: `resolveHref()` normalizes view names (`'library'` or `'library.html'`) to root-relative paths (`/library.html`).
- **Static Asset Guard**: `resolveHref()` must never append `.html` to static assets (`.png`, `.svg`, `.ico`, `.webp`, `.jpg`, `.jpeg`, `.gif`, `.avif`, `.css`, `.js`, `.json`, `.xml`, `.txt`). When passed an asset target (e.g. `'logo.png'` or `'/logo.png'`), it resolves cleanly to `/logo.png`.

### 4. Search Engine & Discovery Sitemaps

TaleTranscend maintains dual sitemaps:

- **Machine-Readable XML Sitemap** (`public/sitemap.xml`): Generated via `scripts/generate-sitemap.js`. Contains indexed static entry points and dynamic tale pages with both pretty routes (`/tales/{id}`) and canonical HTML fallback routes (`/tale.html?id={id}`, `/reader.html?id={id}&chapter={idx}`) with canonical `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>`.
- **Primary Navigation Links & Floating Notification Bell**:
  - `src/ui/components/nav/nav.config.js` configures primary links (`Home`, `Library` on desktop navigation bar with `gap: var(--space-7)` between brand logo and links; secondary routes in Quick Command palette).
  - The bell is **not** in the header. `buildNotifications()` returns `alertsHtml`, which `initNav()` mounts at body level directly after `<header id="app-nav">` (the header's `backdrop-filter` would otherwise trap the fixed positioning — see §5). `#nav-notifications-container` carries `.nav-notifications-float` (`position: fixed; top: calc(var(--nav-height) + var(--space-3)); right: var(--space-5); z-index: var(--z-nav)`) and starts with `is-hidden`.
  - **Visibility rule**: the floating trigger is shown while `unread > 0 || pinned > 0` and removed once the user has neither. `updateNotificationBadge(count)` (unread) and `updatePinnedCount(count)` (pinned) both drive `applyNotificationsVisibility()`; hiding closes the drawer, resets `aria-expanded`, and moves focus to `#nav-profile-link` (falling back to `#nav-user .signin-btn`) when focus was inside the trigger.
  - **Pin controls**: every notice row renders a `.nav-notifications-item__pin` button (`data-notification-id`, `aria-pressed`, label "Pin notice" / "Unpin notice"). Pinned rows get `.nav-notifications-item--pinned` (accent rail) and pinned rows are listed first. Clicks are delegated in `nav.interactions.js` to `toggleNotificationPin()`, which reads the current `aria-pressed` and calls `setNotificationPinned(userId, id, !isPinned)`.
  - **Data model**: `users/{uid}/notifications/{id}` carries `isRead` and `isPinned` (schema default `false`). `getUserNotifications()` queries the recent window _and_ a separate `where('isPinned','==',true)` window (single-field equality, so no composite index) and merges pinned-first, de-duplicated — an old pinned notice stays visible after ageing out of the recent window. `subscribeUnreadNotifications` / `subscribePinnedNotificationCount` provide the two real-time counts.
  - **Rules**: owners may update only `isRead`, `readAt`, `isPinned` on their own notices (allowlist in `firestore.rules`, covered by `firestore/tests/rules.emulator.test.ts`); both `isRead` and `isPinned` must be booleans and no other field may ride along.
  - **Row rendering contract**: `createNotification()` normalizes legacy `link` / `message` writes onto `actionUrl` / `body`. Rows render an `<a>` only for safe in-app targets (`resolveHref()`; schemes and protocol-relative URLs are dropped) and fall back to a plain `<div>` otherwise, so a stored value can never execute. `createdAt` may be a Firestore `Timestamp`, `Date`, or millis — normalize before `timeAgo()`. A render fault swaps the loading state for a failure message rather than hanging.
  - Interactive popover (`#nav-notifications-popover`) anchors beneath the trigger, integrating the real-time snapshot listeners from `notification.service.js`; it lists recent notices with a "Mark read" action and is closed by Escape (focus returns to the trigger) or an outside click. Popover and items use semantic CSS classes (`.nav-notifications-*`) mapped to design tokens (`var(--bg-elevated)`, `var(--border)`).
  - **Toast column**: the floating trigger shares the top-right column with `.toast-region`; `body:has(.nav-notifications-float:not(.is-hidden)) .toast-region` pushes the toast stack down while the trigger is visible.
  - **Dynamic Theme Synchronization**: Navigation bar styles in `src/assets/css/nav.css` cleanly adapt to the active website theme (`[data-app-theme='transcendental']`, `[data-app-theme='dark']`, `[data-app-theme='light']`) using design tokens. The navbar relies on the site-wide theme controls (footer and settings) and does not contain a duplicate navbar toggle.
- **Search Empty State & Instant Suggestions**:
  - `renderEmptySearchState(query, container)` in `src/ui/components/feedback.js` displays a dedicated technical state when zero results match, providing the active query term, suggested search tags, and a "Clear filters" reset action.
  - Home hero search bar includes an instant suggestions dropdown (`#hero-search-suggestions`) that reveals matching chronicles as the user types without requiring navigation.
- **Human-Readable Living Codex** (`src/views/toc.html` & `src/pages/toc/`): A rich interactive Table of Contents categorizing chronicles by pantheon (Greek, Norse, Egyptian, Urban Myths, etc.), chapter count, resonance score, and reading duration.

### 5. Fixed Overlays & Stacking Context / Containing Block Trap

Fixed-position modal overlays (such as the Quick Navigation Command Palette `.command-overlay`) require `position: fixed; inset: 0;` to shade and blur the full viewport (`100vw` × `100vh`).

- **CSS Containing Block Trap**: Per CSS specifications, applying `backdrop-filter: blur(...)`, `transform`, `filter`, or `perspective` to an ancestor container (such as `<header id="app-nav" class="app-nav">`) causes that ancestor to act as the containing block for all `position: fixed` descendants.
- **Trap Consequence**: If `#nav-command-palette` is nested inside `<header id="app-nav">`, `.command-overlay` (`inset: 0`) is trapped within the header's bounds (~64px height), leaving the entire remainder of the viewport (sidebars, repository grids, content) unshaded and unblurred.
- **Rule**: All viewport-spanning modal overlays, palettes, and backdrop scrims (`#nav-command-palette`, `#mobile-dock-container`, dialogs) MUST be mounted directly to `document.body` (`insertAdjacentHTML('beforeend', ...)`).
- **Template Separation**: `buildNav()` in `src/ui/components/nav/nav.templates.js` must return distinct HTML fragments: `{ headerHtml, dockHtml, alertsHtml, paletteHtml }`.
- **Teardown**: `destroyNav()` in `src/ui/components/nav/nav.js` must cleanly remove all mounted body nodes: `document.getElementById('nav-command-palette')?.remove()`, `document.getElementById('mobile-dock-container')?.remove()`, `document.getElementById('nav-notifications-container')?.remove()`.

### 6. Lookup-Style Command Palette & Page Back Navigation

- **Palette Layout Rule**: `#nav-command-palette` is a lookup surface, not a titled search panel. The search field row (`#nav-command-input` with `#nav-command-clear` and the inline `#nav-command-close`) is the panel's first child and visual anchor; results (`#nav-command-list`) follow directly, then the keyboard-hint footer. Do not reintroduce a visible title/header block above the field.
- **Accessible Dialog Name**: The palette dialog is named by a visually hidden `<h2 id="nav-command-title">` styled through `.command-title` in `nav.css` — keep that rule self-contained instead of switching to the `base.css` `.sr-only` utility, because the palette is mounted dynamically by `nav.global.js` (which only guarantees `nav.css`) and the host page's stylesheet set must not matter.
- **Match Highlighting**: `highlightMatch()` in `src/ui/components/nav/nav.command-palette.js` wraps query matches in `<mark class="command-item__match">`. It matches against the raw label/description and escapes every fragment before injection, so HTML entities and hostile queries cannot break rendering.
- **Palette Contract**: `#nav-command-input`, `#nav-command-list`, `#nav-command-clear`, `#nav-command-close`, `.command-panel`, `[data-command-close]`, and `.command-item` are load-bearing selectors for `nav.interactions.js` delegation and must survive any palette restyle.
- **Look-Up Glyph**: The nav quick-tools triggers (`#nav-command-button`, `#nav-command-button-mobile`) and the palette field row request `data-lucide="look-up"` — a custom composite glyph (eye with an upward arrow) registered in `src/ui/icons.js`, because Lucide ships no eye+arrow icon. The header triggers are filled with the theme accent: `--accent-gradient` beneath a 30% ink overlay (`rgb(var(--dark-rgb) / var(--a-08))`), which keeps `--text-on-accent` above 4.5:1 in all three themes (white on the raw luminous dark-theme accent does not clear AA). They add `--shadow-inset-hairline` plus an accent-tinted drop shadow, `translateY(-1px)` on hover, and an accent-tint focus ring. The `⌘K` hint chip is translucent on-accent chrome (`rgb(var(--light-rgb) / var(--a-03))`), so it reads over the fill in every theme. Below 1024px the icon-only variant becomes a 38px border-box square matching `.nav-icon-btn`. Do not reintroduce per-theme `.command-trigger` surface overrides — the accent/ink tokens already carry each theme.
- **Page Back Navigation**: Pages that are not reached through the universal nav (profile, settings, shelf, tale) provide their own Back control. The profile page ships only a single `#profile-back-btn` (`.btn-back-pill`) in the identity pillar. `handleProfileBack()` calls `history.back()` only when an in-app origin is provable (same-origin `document.referrer`, or `history.state.url` pushed by `router.js` soft navigation) and otherwise falls back to `/library.html`. Bind via `initProfileBackButton()`, which is idempotent per DOM node so soft-navigation re-inits and the auth re-init cannot double-fire.

### 7. Brand Mark, Account Menu Trigger & Profile Link

The header brand block splits into three roles; keep them from re-merging:

- **Brand Mark = Account Menu (members only)**: `.nav-brand__anchor` (`#nav-brand-anchor`) wraps the logo mark. For a signed-in user the mark is a `<button id="nav-menu-btn" class="nav-logo__mark nav-logo__mark--menu">` with `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls="user-dropdown"`; it toggles the account dropdown that `buildAccountMenu()` renders beside it, anchored under the mark (`.nav-brand__anchor .dropdown { left: 0; right: auto; transform-origin: top left; }`) instead of the old top-right avatar anchor. Hover/focus (and `aria-expanded="true"`) cross-fades the logo for the `data-lucide="menu"` hamburger glyph so the menu affordance is visible before the first click. The logo-hiding rules are scoped to the `--menu` modifier on purpose: the guest mark has no glyph to swap in, so unscoped `:hover`/`:focus-visible` rules would blank the brand for every signed-out visitor.
- **Wordmark = Home Link**: `.nav-logo__wordmark` is a standalone `<a>` to the home page (previously the whole brand block was one anchor).
- **Avatar = Direct Profile Link**: `#nav-profile-link` (`.nav-avatar`) navigates straight to `profile.html` — no `aria-haspopup`, no chevron; the account dropdown must not be re-attached to the avatar.
- **Settings Has No Header Icon**: `.nav-actions` holds only the quick-tools triggers and `#nav-user`. Settings is reached from the account menu (`USER_LINKS` in `nav.config.js`) and the command palette. Keep `settings.html` in `USER_LINKS` — removing the header icon must not strand the page. `#nav-settings-btn` no longer exists; anything that needs a neutral icon-button shell uses `.nav-icon-btn` (the floating notification trigger does). Below 480px the wordmark hides so the 38px accent trigger and the sign-in CTA fit without horizontal overflow; the logo mark remains the brand control (account menu for members, home link for guests) and the mobile dock still carries Home.
- **Guest Fallback**: guests have no account menu, so `buildBrandMark(null)` renders the mark as a plain home link (`aria-label="TaleTranscend home"`). `updateNavUser()` swaps both `#nav-brand-anchor` and `#nav-user` on every auth change, and all dropdown helpers key off the `menuButton` entry from `getNavElements()`.

### 8. Mobile Bottom Dock

- **Three Destinations Only**: `DOCK_ITEMS` in `nav.config.js` is Home, Library, Shelf. Write is an account-menu/palette action and Profile is the header avatar, so neither belongs in the dock. `buildMobileDock(current)` is auth-independent and takes no user argument; `updateNavUser()` must not rebuild the dock.
- **Active Sync**: `updateNavActiveLinks()` in `src/utils/router.js` selects `#mobile-dock-container .mobile-dock__item` and toggles `mobile-dock__item--active` plus `aria-current="page"`. Keep the class names in step with `buildDockItem()` - the retired `.dock-item` selector silently matched nothing.
- **Chrome**: The dock is a floating rectangular bar (`--radius-lg`), theme-aware translucent `--bg-overlay-rgb` fill with backdrop blur, a hairline border, and a restrained shadow. It must not regress to a 9999px pill, gradient shimmer, glow, or pulsing dot. The active tab is an accent-tinted 28px icon plate plus a 2px accent rule at the item's bottom edge; labels are 9px uppercase.
- **Targets & Fit**: The bar is 58px tall and each item fills the 56px content box, clearing the 44px touch target. It grows with the label under text scaling (`min-height`, not a fixed height). The bar caps at `min(344px, calc(100vw - 24px))` and sits above `env(safe-area-inset-bottom)`, so it fits a 390px viewport without horizontal overflow.
- **Shelf Page Exception**: `src/assets/css/pages/shelf.css` hides `#mobile-dock-container` on `body.page-shelf` because the vault page ships its own sticky header and Back control. The Shelf dock item still routes there; do not remove that hide rule without redesigning the shelf header.

## Tools / Scripts to Use

- Run the navigation and routing test suite:
  ```powershell
  python execution/verify_navigation_and_ui.py
  ```
- Run vitest navigation tests directly:
  ```powershell
  npx vitest run src/utils/__tests__/navigation.test.js
  ```

## Outputs

- Deep links on `/tales/:id` and `/tales/:id/read/:chapter` navigate smoothly to root pages without path nesting errors.
- Both `/sitemap.xml` and `/toc.html` remain fully synchronized with archive chronicles.

## Edge Cases & Error Handling

- **Static Asset Suffix Bug**: If `resolveHref()` appends `.html` to an image (e.g. `/logo.png.html`), Vite returns a fallback `text/html` document resulting in a broken image placeholder in the browser. Always verify that asset filenames retain their exact extension.
- **Query Strings & Hashes**: `resolveHref('tale.html?id=abc#comments')` preserves query parameters and fragments exactly while ensuring the base path is root-relative.
- **External URLs**: `resolveHref` detects `http://`, `https://`, `mailto:`, `tel:`, and `#` targets and leaves them unaltered.
