# Directive: Accessibility, UI Standards, and Brand Assets

## Goal

Define explicit standards for footer layout isolation, accessible toasting, keyboard shortcut navigation, ARIA tagging, and official brand emblem asset usage across TaleTranscend.

## When this fires

- Designing, refactoring, or reviewing page layouts, footers, and view structures.
- Implementing notification toasts, alert banners, or system messages.
- Adding interactive components, inputs, dialogs, command palettes, or keyboard shortcuts.
- Updating logo marks, icons, favicons, social cards, or boot curtains.

## Inputs

- Component sources: `src/ui/components/toast.js`, `src/ui/components/nav/nav.templates.js`, `src/ui/components/nav/nav.interactions.js`.
- View templates: `src/views/*.html`.
- Stylesheets: `src/assets/css/nav.css`, `src/assets/css/components.css`, `src/assets/css/tokens.css`.
- Public brand assets: `public/logo.png`, `public/logo-wide.png`, `public/icon.svg`, `public/apple-touch-icon.png`, `public/favicon.ico`.

## Git Safety (If Modifying Code)

- Always create a dedicated branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` strictly require explicit user approval in the conversation.

## Architectural Principles & Rules

### 1. Footer Isolation Policy (Home Page Only)

- **Strict Rule**: ONLY the home page (`src/views/index.html`) may contain a full site footer (`.home-footer` / `.site-footer`).
- **Inner Pages Forbidden**: Inner application pages (`library.html`, `shelf.html`, `reader.html`, `tale.html`, `contribution.html`, `profile.html`, `login.html`, `toc.html`, `settings.html`, `404.html`) must NEVER contain a footer.
- **Dock Clearance Invariant**: Scrollable containers wrapping the footer (e.g., `<main class="dock-clearance">`) must NOT add extra `padding-bottom` beneath the footer. The footer represents the absolute floor of the document and already handles its own internal clearance. In `base.css`, `.dock-clearance:has(> footer), .dock-clearance:has(footer:last-child)` enforces `padding-bottom: 0` to prevent an unsightly canvas-colored gap beneath the footer.
- **Rationale**: Inner views are specialized application workspaces (reading sanctuaries, writing ateliers, archives). They rely on the persistent global top navbar (`app-nav`) on desktop and the mobile bottom dock (`mobile-dock`) on handheld devices. A footer adds clutter and disrupts full-height layouts.

### 2. Settings Page Layout & Navigation Isolation (`src/views/settings.html`)

- **Dedicated Header & History Back Navigation**: The Settings page intentionally omits the global navigation bar and mobile dock. Instead, it features a specialized fixed top bar with:
  - A dedicated back button (`#settings-back-btn`) that navigates back to the previous address the page was opened from (`history.back()`), falling back gracefully to `/library.html`.
  - A live search filter input (`#settings-search-input`) with clear button (`#settings-search-clear`).
  - System reset trigger (`#btn-reset-settings`).
- **Sidebar-Row Navigation**: Left sidebar provides a row for each section (`Reader Identity`, `Reading Themes`, `Codex Typography`, `Atmosphere & Motion`, `Archival Storage`, `System & Defaults`, `About Codex`) with smooth scrolling and `IntersectionObserver` scrollspy synchronization.
- **Divided Card Rows**: Settings items are organized into elevated cards with horizontal row dividers, maintaining single-source design token compliance and WCAG accessibility standards.

### 3. Accessible Toasting System (`src/ui/components/toast.js`)

- **Live Region Announcement**: Toast container must define `aria-live="polite"` and `aria-atomic="true"` with `role="status"` (or `role="alert"` for high-severity errors) so screen readers announce notifications without stealing focus.
- **Semantic Variants**: Supports `info`, `success`, `warning`, and `error` with Lucide icons (`info`, `circle-check`, `triangle-alert`, `circle-x`) and design-token-compliant accent borders.
- **User Control & WCAG 2.2**:
  - Dismissible: Each toast includes a clear close button with `aria-label="Dismiss notification"`.
  - Pause-on-Interaction: Auto-dismiss timers MUST pause when the user hovers over or focuses inside the toast, resuming when pointer/focus exits (satisfies WCAG 2.2.1 Timing Adjustable).
  - Escape Dismiss: Pressing `Escape` while focused within a toast dismisses it immediately.

### 4. Keyboard Navigation & ARIA Standards

- **Global Command Palette**:
  - Invoked via `Ctrl+K` (Windows/Linux) or `⌘K` (macOS).
  - Triggers declare `aria-keyshortcuts="Control+K Meta+K"`, `aria-haspopup="dialog"`, and `aria-expanded`.
  - Palette modal traps focus and supports ArrowUp/ArrowDown selection with Enter execution. The trap counts only real tab stops: `tabindex="-1"` elements (command items, the clear control) must never resolve as its first or last element, so Tab cycles between the field and its inline close control instead of escaping the dialog.
- **Text Selection Shortcut (`Ctrl+A`)**:
  - In input fields, search boxes, and manuscript atelier textareas, `Ctrl+A` / `⌘A` must reliably select all text without being intercepted by global page shortcuts.
- **Dialog & Modal Focus Trapping**:
  - Every modal must trap focus between its first and last focusable elements while open.
  - Pressing `Escape` must close the top-most modal and restore focus to the triggering element.
- **Meaningful ARIA Attributes**:
  - All icon-only buttons must include an explicit `aria-label`.
  - Decorative icons and marks must carry `aria-hidden="true"`.
  - Active navigation links must include `aria-current="page"`.

### 5. Official Brand Emblem & Quill Assets

The TaleTranscend brand mark is the mythical golden-trimmed black quill pen encircled by stardust rings:

- **`public/logo.png`**: High-resolution 512×512 square transparent PNG with centered quill for UI usage.
- **`public/logo-wide.png`**: 1024×559 PNG for Open Graph (`og:image`) and Twitter Cards (`twitter:image`).
- **`public/icon.svg`**: Base64-embedded quill vector for modern browser tabs and PWA manifests.
- **`public/apple-touch-icon.png`**: 180×180 PNG formatted specifically for iOS home screen bookmarks.
- **`public/favicon.ico`**: Multi-resolution (16/32/48px) favicon for legacy browsers.
- **`src/assets/images/logo.png`**: Colocated asset for local module imports.

#### UI Brand Mark Placements

- **Header Navbar**: `<div class="nav-brand__anchor" id="nav-brand-anchor">` holds the brand mark, rendered by `buildBrandMark()` in `src/ui/components/nav/nav.templates.js`: guests get `<a class="nav-logo__mark" href="index.html" aria-label="TaleTranscend home"><img src="${resolveHref('/logo.png')}" alt="" class="nav-logo__img" aria-hidden="true" width="28" height="28" /></a>`; members get `<button type="button" class="nav-logo__mark nav-logo__mark--menu" id="nav-menu-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="user-dropdown" aria-label="Open account menu for {name}">` followed by the `#user-dropdown` panel. The mark keeps the glass backdrop, accent border, and hover micro-interaction; only the member mark (`--menu`) swaps the logo for the `data-lucide="menu"` hamburger glyph on hover/focus/`aria-expanded="true"`, so guest marks never blank out. `.nav-logo__wordmark` is a separate `<a href="index.html">` home link, and the avatar (`#nav-profile-link`) is a direct link to `profile.html`.
- **Home Footer**: `<span class="home-footer__mark"><img src="/logo.png" alt="" class="home-footer__logo-img" width="22" height="22" /></span>`.
- **Login Screen Header**: `<div class="..."><img src="/logo.png" alt="" class="w-7 h-7 object-contain drop-shadow" aria-hidden="true" /></div>`.
- **Page Boot Curtain**: `<div class="boot-crest"><img src="/logo.png" alt="" width="26" height="26" class="object-contain" /></div>` across all 10 HTML entry points.

### 6. Settings Page Architecture & Dedicated Back Navigation

- **No Global Header/Dock Navigation**: The settings page (`settings.html`) intentionally omits the global application navbar and dock to provide an uncluttered, focused Chrome-inspired settings view.
- **Dedicated Back Button**: Navigation back to the user's prior screen uses `#settings-back-btn` running `handleNavigateBack()`, which verifies same-origin referrer and calls `window.history.back()` (with safe fallback to `/library.html`).
- **Separate Section Views (Non-Continuous Scrolling)**:
  - Each settings category (`Chronicler Profile`, `Reading Themes`, `Codex Typography`, `Atmosphere & Motion`, `Archival Storage`, `System & Defaults`, `About Codex`) is a separate section view. Only the active section is visible (`.hidden` class added to all inactive sections; `.settings-section.hidden { display: none !important; }`).
  - Selecting a sidebar row or navigating via URL hash (`#profile`, `#themes`, etc.) dynamically switches visibility via `switchSettingsSection`.
  - Settings search allows multi-section discovery during active typing, immediately restoring the single active section upon clearing the query.
- **Centralized Chronicler Profile**:
  - Profile identity editing is centralized under `settings.html#profile`.
  - The profile page (`profile.html`) button "Customise Identity" (`#btn-edit-desktop`) redirects users cleanly to `/settings.html#profile`.

### 7. Global Multi-Theme Architecture (Transcendental, Midnight Dark, Illuminated Light)

- **Three Centralized Interface Themes**:
  1. **Transcendental (`transcendental`, Default)**: Signature cosmic starlight dark theme featuring deep obsidian floors (`#030305`), ambient cosmic gradients, and glowing warm amber/rune accents.
  2. **Midnight Dark (`dark`)**: Crisp, high-contrast obsidian-indigo dark theme (`#0b0d13`) with electric indigo highlights, crisp silver typography, and deep slate card elevations.
  3. **Illuminated Light (`light`)**: Authentic mythic archival parchment theme (`#f7f5f0`) featuring ivory and vellum card surfaces, warm slate borders, and imperial dark slate ink typography (`#1e293b`).
- **Single-Source Cascading Tokens**:
  - All theme palettes are strictly defined in `src/assets/css/tokens.css` under `html[data-app-theme='transcendental']`, `html[data-app-theme='dark']`, and `html[data-app-theme='light']`.
  - Shared geometric constants and typography variables reside in the subsequent `:root` block without clobbering color schemes, elevation shadows, or navigation backgrounds.
  - Page-layout tokens (`--sidebar-width`, `--editor-header-height`, `--left-panel-width`, `--action-bar-height`, `--atelier-*-width`, `--scrollbar-*`) also live in that shared `:root` area (the "Page Layout" group inside section 8 of `tokens.css`). Page stylesheets must not declare their own `:root` token blocks — the 2026-10-18 audit (F14) consolidated the contribution/library/profile/tale blocks into `tokens.css`; add new tokens there instead.
- **Synchronous Anti-FOUC Theme Hydration**:
  - Every HTML document (`index`, `library`, `shelf`, `tale`, `reader`, `profile`, `settings`, `contribution`, `toc`, `login`, `404`) includes an immediate `<script>` tag in `<head>` before stylesheets load:
    ```html
    <script>
      (function () {
        try {
          var t = localStorage.getItem('tt_app_theme') || 'transcendental';
          document.documentElement.setAttribute('data-app-theme', t);
        } catch (e) {}
      })();
    </script>
    ```
  - Followed by the Critical Anti-FOUC Gate `<style>` styling `html`, `html[data-app-theme='dark']`, and `html[data-app-theme='light']` to guarantee zero white or dark flash during page transitions.
- **Cross-Tab & System Synchronization**:
  - Managed by `src/config/theme.config.js` (`applyAppTheme`, `getAppTheme`, `initAppTheme`).
  - Automatically updates `<meta name="theme-color">` dynamically.
  - Window `storage` event listener keeps all opened tabs in sync when theme preferences change in Settings.
- **Zero Hardcoded Dark Classes**:
  - No page body or container should use hardcoded `bg-slate-950`, `bg-[#030305]`, `text-white`, or `text-slate-300`.
  - Use bridged Tailwind tokens: `bg-bg-base`, `bg-surface-1`, `bg-surface-2`, `text-ink`, `text-muted`, and `border-line`.

### 8. Section Pacing & Light Mode Visual Comfort Standards

- **Soothing Archival Parchment (Zero Harsh Glare)**:
  - In Illuminated Light mode (`html[data-app-theme='light']`), avoid stark pure-white (`#ffffff`) on massive surface areas.
  - Page ground is calibrated to warm archival manuscript vellum (`--bg-base`: `#f6f3ed`).
  - Elevated card surfaces use soft alabaster ivory (`--card-elevated-bg` / `--grey-900`: `#fbf9f5`).
  - Secondary drawers and footer foundations use deeper antique vellum (`--footer-bg`: `#eae3d4`).
  - Primary text uses deep charcoal carbon (`--text-primary`: `#1c2530`), providing optimal contrast and readability without high-glare retinal fatigue.
- **Section Pacing & Atmospheric Alternation**:
  - Long landing and reading pages feature rhythmic visual pacing down the viewport.
  - Alternating section bands use `--section-alt-bg` (`rgb(238 232 220 / 0.45)` in light; `rgb(16 20 30 / 0.6)` in dark) with subtle 1px border dividers to frame grids such as Trending Chronicles.
  - Colophon footers are anchored with `--footer-bg` and top border dividers to cleanly terminate the reading surface.
- **Diversified Mythic Chromatic Palette**:
  - Topic tags and era badges derive their identities from six centralized mythic color tokens defined in `tokens.css` across all three themes:
    1. **Mythic Gold** (`--mythic-gold`): Burnished amber rune / brass.
    2. **Mythic Sage** (`--mythic-sage`): Folklore forest / herbalist green.
    3. **Mythic Lapis** (`--mythic-lapis`): Royal lapis lazuli / imperial indigo.
    4. **Mythic Terracotta** (`--mythic-terracotta`): Rubric terracotta / oral tradition red.
    5. **Mythic Cyan** (`--mythic-cyan`): Glacial ice / northern sky.
    6. **Mythic Violet** (`--mythic-violet`): Mystic elder / celestial violet.
  - Each chromatic token provides corresponding `--mythic-*-bg` and `--mythic-*-border` variables for tags, badges, and icon shields without inline hex or rgb overrides.
- **Scholar Scribe Tile**:
  - Scribe and authoring calls-to-action feature an elevated scholar plate with a burnished gold shield emblem (`feather` icon) and high-contrast call-to-action buttons.

### 9. Settings Interface, Architecture Sections & Codex Readability

- **Unified Architectural Sections**:
  - The settings interface is segmented into dedicated, modular views:
    - **Chronicler Profile** (`#section-profile`): Persona avatar, display moniker, author lore bio, pronouns, location, reading goal, and cloud archive status.
    - **General & Theme** (`#section-general`): Global application interface theme (Transcendental / Midnight Dark / Illuminated Light), Oracle AI & Gemini API key (status indicator and popup modal), and factory default restoration.
    - **Reader & Codex** (`#section-reader`): Default reading parchment (12 authentic manuscript themes) and codex typography settings (typeface style, font size, line spacing, measure width, live preview).
    - **Atmosphere & Motion** (`#section-atmosphere`), **Archival Storage** (`#section-storage`), and **About Codex** (`#section-about`).
  - Hash navigation seamlessly resolves legacy hashes (`#themes` and `#system` -> `#section-general`, `#typography` -> `#section-reader`).
- **Dedicated Sideheading & Below-Field Layout (`.settings-row--stacked`)**:
  - Full-width longform inputs, notably the Chronicler Lore / Bio textarea (`#input-bio`), must be stacked vertically below the sideheading, descriptive subtitle, and info shield rather than squeezed beside it in a split two-column row.
  - Includes a real-time character count indicator (`#bio-char-count`: e.g. `142 / 1000`) and field advice tips.
- **Dedicated Popup Modal for Sensitive Settings**:
  - Storage of sensitive credentials such as the Google Gemini API key is housed in the General section and initiated through an accessible popup modal window (`#modal-gemini-key`) instead of inline password fields.
  - The modal provides security guidance regarding client-only local storage, password visibility toggling, direct links to Google AI Studio, and clear/remove functionality.
  - The settings row presents an accessible status badge (`#gemini-key-status`: `.settings-status-badge--active` vs `.settings-status-badge--inactive`).
- **Clean Reader Theme Specimens (Zero Light/Dark Tags)**:
  - Each of the 12 reader themes (`src/config/theme.config.js`) provides explicit palette metadata (`mode`, `bg`, `fg`, `accent`, `tint`).
  - Specimen cards (`.theme-specimen`) display miniature manuscript specimens showcasing genuine parchment color, ink foreground sample glyph `"Aa"`, and accent pip dot, with all decorative "LIGHT" or "DARK" text badges removed for a clean, distraction-free aesthetic.
- **Typography Filters & Live Codex Preview Contrast**:
  - Font selector chips (`.settings-font-chip`) use semantic token-backed classes (`.settings-font-chip__title` with `var(--text-primary)`, `.settings-font-chip__sub` with `var(--text-muted)`) preventing washed-out white text on light surfaces.
  - Column measure buttons (`.setting-measure-btn.btn-primary`) render solid royal indigo backgrounds (`rgb(var(--accent-rgb))`) with crisp white text (`var(--text-on-accent)`).
  - The Live Codex Preview sandbox applies the active manuscript theme ink and parchment background dynamically, ensuring headers and paragraph text remain sharp and legible across all modes.

### 10. Sticky Sidebar Navigation & Profile Light Mode Standards

- **Sticky Sidebar Pinning in CSS Grid (`align-self: start`)**:
  - In CSS Grid layouts, child grid columns default to `align-self: stretch`, expanding the navigation column to the height of the entire page content. This prevents `position: sticky` from travelling as the user scrolls.
  - Sticky sidebars (such as `.settings-sidebar` in `settings.html` and `.pillar-left` in `profile.html`) must declare `align-self: start; position: sticky; top: calc(60px + var(--space-6)); max-height: calc(100vh - 80px); overflow-y: auto;`. This collapses the sidebar to its intrinsic content height, allowing it to stay pinned in the viewport while the main content scrolls.
- **Profile Light Mode Contrast & Anti-Vibecoding Standards**:
  - **Zero Glowing or Pulsing Indicator Dots**: Avatar containers must not contain neon green status indicator pips or pulsing dots (`bg-emerald-500 rounded-full`).
  - **Zero Pill Badges**: Badges such as `.mythic-badge`, `.resize-handle-grip`, and `#profile-author-badge` must use crisp rectangular technical shield styling (`border-radius: var(--radius-xs);` or `rounded-xs`) instead of pill shapes (`border-radius: 9999px;` or `rounded-full`).
  - **Semantic Theme Typography**: Never apply hardcoded `text-white` to titles or headings on page surfaces. Use semantic classes (`.profile-user-name`, `.profile-section-heading`, `.stat-value`, `.new-story-cta-title`) tied to `var(--text-primary)`, guaranteeing rich charcoal text in light mode and off-white in dark mode.
  - **Alabaster & Parchment Card Hierarchy**: Profile cards (`.identity-card`, `#author-registry-card`, `.stat-card-mythic`, `.chronicle-goal-card`, `#btn-new-story`) render `rgb(var(--bg-overlay-rgb) / 0.94)` with subtle 1px borders in light mode for a distraction-free, archival feel.
  - **Harmonious Resize Grips**: Multi-column separator handles (`.resize-handle-grip`) adapt to the theme ground (`var(--bg-overlay)` in light mode, `rgb(var(--dark-rgb) / var(--a-11))` in dark mode) avoiding harsh black pill artifacts.

### 11. Site-Wide Multi-Page Theme Contrast & Surface Standards

- **Prohibition of Hardcoded Ground Colors**: Never hardcode dark container utility classes (such as `bg-slate-950/90`, `bg-slate-950/40`, `bg-black/30`, `bg-black/40`) or hardcoded light text utility classes (`text-white`, `text-slate-200`, `text-slate-300`, `text-indigo-100`) directly on surfaces that exist in both dark and light themes.
- **Semantic Replacements**:
  - Headers and sticky navbars: Use `bg-[var(--nav-bg)] border-b border-line backdrop-blur-2xl`.
  - Sidebars and workspace panes: Use `border-line bg-transparent` or `bg-[var(--bg-base)]`.
  - Form inputs and textareas: Use `border-line bg-surface-2 text-[var(--text-primary)] placeholder:text-muted`.
  - Titles, headings, and primary body: Use `text-[var(--text-primary)]`.
  - Secondary metadata and subtext: Use `text-secondary` or `text-muted`.
  - Accent quotes and runes: Use `text-[var(--mythic-gold)]` (resolves to `#fbbf24` in dark and `#b45309` in light).
- **CSS Light Theme Elevation Overrides**: Every page stylesheet (`shelf.css`, `tale.css`, `toc.css`, `contribution.css`, `profile.css`, `settings.css`, `login.css`) must explicitly define `[data-app-theme='light']` rules for all cards, panels, popups, and inputs, assigning them `var(--bg-elevated)` or `var(--surface-2)` with `border-color: var(--border)`.

### 12. Application Theming Architecture & Specimen Standards

- **Core Theme Registry**: Registered in `src/config/theme.config.js`:
  - `transcendental`: Signature mythic cosmic dark (default; `#030305` ground, starlight indigo & warm amber runes).
  - `dark`: Midnight obsidian & luminous indigo (`#0b0d13` ground, high-contrast silver typography).
  - `light`: Illuminated manuscript parchment (`#f6f3ed` ground, warm vellum, alabaster card surfaces & royal ink).
  - `system`: Automatic device preference synchronization with live OS `prefers-color-scheme` listeners.
- **Invariant Miniature Interface Specimens**:
  - Theme cards in `settings.html` must render authentic miniature application window mockups (`.app-theme-preview`), not generic monospace text block tags or metadata badges.
  - Every specimen displays window chrome with control dots, search notch, sidebar navigation bars, story card with title/body skeleton bars, and interactive accent buttons.
  - Specimen cards use dedicated tokens in `tokens.css` (`--specimen-transcendental-*`, `--specimen-dark-*`, `--specimen-light-*`) so that all previews render true-to-theme simultaneously regardless of which theme is currently active.
  - `system` preview renders a split half-dark / half-light layout (`.app-theme-preview--system`) with a technical hairline divider.
- **Zero-FOUC Boot Invariant**:
  - Every HTML template (`src/views/*.html`) executes an inline script in `<head>` before CSS and module bundles parse.
  - If preference is `system`, the script resolves `matchMedia('(prefers-color-scheme: dark)')` to `'transcendental'` or `'light'` prior to initial layout, preventing flash of unstyled theme.
- **Fluid Cross-Fade Transitions**:
  - Runtime theme switches trigger a temporary `.theme-transitioning` class on `<html>` for 250ms (`base.css`).
  - Transitions smooth background, border, text color, and box shadow over `var(--dur-base)` (240ms).
  - Skips transition on boot or when `prefers-reduced-motion: reduce` is detected.
- **Global Command Palette Integration**:
  - Theme switches are registered as first-class actions (`theme:transcendental`, `theme:dark`, `theme:light`, `theme:system`) in `nav.config.js`.
  - Users can switch themes instantly from any page via `Ctrl+K` / `⌘K` under the "Appearance & Theme" group.
- **Light Mode Content Contrast & Badge Readability**:
  - Content panes (e.g., Synopsis descriptions, lore tags, chapter scrolls, reflections, and inquiry forms) often inherit legacy dark-mode utility classes like `text-slate-300`, `text-slate-400`, `bg-white/4`, and `border-white/6`.
  - Under `[data-app-theme='light']`, all body text must explicitly map to `var(--text-primary)`, metadata tags/pills to `var(--surface-2)` or `var(--surface-3)` with `var(--border)` and `var(--text-secondary)`, and section badges/icons to `var(--accent)`.
  - Ensures WCAG AA compliance (contrast ratio >= 4.5:1) on white/elevated cards without breaking dark theme obsidian surfaces.
- **Boot Curtain Fallback Window**:
  - Across all 11 HTML entry templates, the hard fallback safety timeout on the boot curtain (`#boot-curtain`) is calibrated to 1500ms (reduced from legacy 3500ms).
  - This ensures users are never blocked by an unresponsive boot scrim during cold loads, network stalls, or slow mobile connections.
- **Card Progress Bar Display Rule**:
  - Library cards (`taleCard.js`) and shelf continue-reading rows must only render progress bars and percentage text when `progress > 0`.
  - Unstarted chronicles must never display misleading "PROGRESS 0%" indicators.
- **Animation Safety in Test Environments**:
  - Dynamic count-up animations, such as the Shelf hero statistics (`_animateStatCount`), use `requestAnimationFrame` with cubic ease-out in the browser.
  - In unit and integration test runners (e.g. Vitest JSDOM), RAF evaluation can be deferred while assertions execute synchronously.
  - All counter and RAF routines must check `import.meta.env?.MODE === 'test'` or `process.env.NODE_ENV === 'test'` to set destination values synchronously during test runs.
- **Scroll-to-Top Floating Button Standard**:
  - Floating utility controls (like `#scroll-to-top`) must NEVER hardcode dark-mode utility classes (e.g. `text-indigo-300`, `group-hover:text-white`).
  - Icons inside `#scroll-to-top` must inherit `currentColor` (`stroke: currentColor`), tied to `var(--text-primary)` (default) and `var(--accent)` (hover).
  - Backgrounds, borders, and shadows must derive exclusively from design tokens (`var(--bg-overlay)`, `var(--border-strong)`, `var(--shadow-md)`, `var(--shadow-glow)`), ensuring high contrast across both light and dark themes.

### 13. CSS Architecture: Class Ownership & Shared Surfaces (Audit F9, 2026-10-18)

- **Single-Owner Class Names**: A class defined in a page stylesheet is owned by that page. Never reuse another page's class name for a different visual treatment. Renames completed in the audit: the contribution page uses `.atelier-card` (editor panels), `.era-chip` (+ `data-era-chip`), and `.chapter-row*` (chapter list); `shelf.css` keeps `.shelf-card`, `toc.css` keeps `.era-pill`, and `tale.css` keeps `.chapter-item`.
- **Shared Components Live in `components.css`**: Genuinely identical rules go in `src/assets/css/components.css`. The comment-thread geometry (`.comment-replies-list` base, indentation and both breakpoints, `.reply-target-tag`) lives in its `COMMENT SURFACE (SHARED LAYOUT)` section; colour/theme-dependent comment rules stay page-local (`reader.css` uses reader-theme tokens, `tale.css` uses app tokens).
- **Profile Skins Are Documented Shadowing**: `profile.css` intentionally overrides the shared `.btn-ghost` / `.input-mythic` components (the file loads only on the profile page). Its hover rule carries only the declarations that actually win the cascade (colour, transform); read the in-file comments before removing or restyling those overrides.
- **No Dead Orphan Rules**: When a component stops being used on a page, delete its page-level overrides (e.g. the `.stat-value` no-op removed from `profile.css`, the dead `.theme-btn` block removed from `components.css`) instead of leaving them for a future reader to reconcile.

### 14. Mobile Viewport Invariants (320–768px, Audit 2026-10-19)

- **Document-level overflow is a bug; contained overflow is a decision.** Decorative layers must be clipped inside a `fixed inset-0 overflow-hidden pointer-events-none -z-10` wrapper, never parked at negative offsets on the body. Page scrollers (`.scroll-container`, `overflow-x: hidden`) may contain intentional strips (era chips, settings sidebar, profile tabs), but no control a phone user must reach may sit outside the viewport.
- **Phone topbar (≤560px)**: the nav preserves the TaleTranscend wordmark between the brand mark and action triggers using fluid scaling, ellipsizing, and tightened gaps/padding so search, user controls, and sign-in fit without horizontal overflow down to 320px.
- **Fixed bars cannot be scrolled.** The settings top bar (`.settings-top-bar`) must keep every control on-screen; below 520px the 140px side reservations collapse and the search shrinks (`min-width: 0`, 32px padding) instead of pushing Reset off-screen.
- **Header rows that cannot shrink must wrap.** The library header wraps its search below the title from `md` until `xl` (`md:flex-wrap xl:flex-nowrap`); the shelf and contribution toolbars tighten paddings below 380px/359px rather than hiding features.
- **Breakpoints.** The intended convention is mobile `<768`, tablet `768–1023`, desktop `≥1024`. New rules follow it; the legacy 639/640, 767/768, 839/840 and 1023/1024 variants are recorded and were not broad-refactored in the mobile pass.
- **Phone touch targets.** Nav search, notifications, settings and the guest CTA render as 44×44 targets below 560px; the signed-in avatar keeps its 38px visual inside a 44px hit area. Dock labels are 10px minimum. The library drawer close and the contribution tool rail also use 44px targets; the rail wraps 2×2 below 385px.
- **Fixed-element clearance.** Below 1024px `.dock-clearance` reserves 144px at the bottom for the dock plus the 44px scroll-to-top button. Page ID rules must leave `padding-bottom` to that class (set `padding-top` / `padding-inline` only); off-canvas drawers hide the dock and FAB while open.
- **Fixed/overlay containers must reset inherited transforms when re-anchored.** Two `.toast-region` blocks apply at ≤768px; the later one sets `left`/`right` but not `transform`, so the earlier `translateX(-50%)` shifted the container to `-136px` at 320. When a later rule changes the anchoring axis, set `transform: none`.
- **Tablet header rows switch at `lg`, not `sm`.** In the profile's 768–1199 two-column workspace the content column is ~416px; a `sm:flex-row` header pushed the archive tabs and the achievements badge past the viewport. Use `lg:flex-row` / `lg:items-end`, and `w-fit` for compact trailing controls.
- **Ellipsizing text needs a constrained flex parent.** `truncate` alone is not enough: pair it with `min-width: 0; max-width: 100%` on the text and `width: 100%; min-width: 0` on its parent, otherwise a centered flex column sizes to max-content and the name escapes its card.
- **Narrow metric grids use auto-fit.** `repeat(4, 1fr)` forces min-content overflow in a 368px grid; `repeat(auto-fit, minmax(8.5rem, 1fr))` plus `min-width: 0` items keeps 2×2 at 768 and expands to 4-up when there is room.
- **≤360px nav links go icon-only.** Hide label spans at `max-width: 22.5rem` and keep an `aria-label` on each link rather than letting the last link clip.
- **Audit candidates are not verdicts.** `fullPage` screenshots move fixed docks to the image bottom; closed drawers/modals, decorative orbs, scroll strips and empty pre-adoption toast containers are expected. Check computed `overflow-x` and the adopted/visible state before changing them.
- **Verification**: `execution/capture_responsive_audit.mjs` (all routes × widths) plus `e2e/specs/mobile-shell.spec.js` (Pixel 7 + iPhone 14). Any new browser tooling must seed `tt_has_visited` and assert it never measured `/login.html`. Also check max-scroll FAB clearance and open-drawer reachability at 320px.

## Tools / Scripts to Use

- Run the UI and navigation verification suite:
  ```powershell
  python execution/verify_navigation_and_ui.py
  ```
- Run the responsive audit sweep against the worktree's allocated port:
  ```powershell
  $env:AUDIT_PORT=(Get-Content .dev-port); node execution/capture_responsive_audit.mjs
  ```
- Run toast component tests:
  ```powershell
  npx vitest run src/ui/components/__tests__/toast.test.js
  ```
- Run design token linter:
  ```powershell
  npm run lint:tokens
  ```

## Outputs

- Single-page footer isolation strictly maintained (only `index.html` has a footer).
- Zero broken image links across navbar, footer, auth, or boot curtains.
- Accessible toast alerts and complete keyboard shortcuts operational.
- Seamless, flicker-free multi-theme support across all 11 application views.

## Edge Cases & Error Handling

- **Focus Restoration**: When dismissing a toast or modal, return focus to the last active element or document body to prevent keyboard focus from getting lost.
- **Reduced Motion**: All toast animations and boot crest pulses must respect `prefers-reduced-motion: reduce`.
- **LocalStorage Failure**: When `localStorage` is disabled or restricted in private browsing modes, `applyAppTheme` and the inline script catch exceptions gracefully and fall back to the default `transcendental` theme.
