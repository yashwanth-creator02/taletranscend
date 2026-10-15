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
  - Palette modal traps focus and supports ArrowUp/ArrowDown selection with Enter execution.
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

- **Header Navbar**: `<div class="nav-logo__mark"><img src="${resolveHref('/logo.png')}" alt="" class="nav-logo__img" aria-hidden="true" width="28" height="28" /></div>`. Styled with subtle glass backdrop, gold border (`var(--accent-rgb)`), and hover micro-interaction.
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

### 9. Settings Interface, Stacked Bio & Reader Theme Specimens

- **Dedicated Sideheading & Below-Field Layout (`.settings-row--stacked`)**:
  - Full-width longform inputs, notably the Chronicler Lore / Bio textarea (`#input-bio`), must be stacked vertically below the sideheading, descriptive subtitle, and info shield rather than squeezed beside it in a split two-column row.
  - Includes a real-time character count indicator (`#bio-char-count`: e.g. `142 / 1000`) and field advice tips.
- **Dedicated Popup Modal for Sensitive Settings**:
  - Storage of sensitive credentials such as the Google Gemini API key must be initiated through an accessible popup modal window (`#modal-gemini-key`) instead of inline password fields.
  - The modal provides security guidance regarding client-only local storage, password visibility toggling, direct links to Google AI Studio, and clear/remove functionality.
  - The settings row presents an accessible status badge (`#gemini-key-status`: `.settings-status-badge--active` vs `.settings-status-badge--inactive`).
- **Reader Theme Manuscript Specimens (Light Mode Distinctiveness)**:
  - Each of the 12 reader themes (`src/config/theme.config.js`) provides explicit palette metadata (`mode`, `bg`, `fg`, `accent`, `tint`).
  - To prevent pale reading themes (Sepia, Cream, Solarized Light, Editorial) from looking identical or unreadable in Light Mode:
    - Each theme option card (`.theme-option-card`) renders a miniature manuscript specimen (`.theme-specimen`) showcasing the genuine background color, ink foreground sample glyph `"Aa"`, accent pip dot, and an uppercase `LIGHT` or `DARK` badge.
    - Card titles (`.theme-option-card__name`) and subtitles (`.theme-option-card__sub`) strictly inherit `--text-primary` and `--text-secondary`, guaranteeing crisp, dark charcoal contrast on light surfaces rather than washed-out white text.

## Tools / Scripts to Use

- Run the UI and navigation verification suite:
  ```powershell
  python execution/verify_navigation_and_ui.py
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
