# Directive: Code Conventions and Architecture Standards

## Goal

Enforce architectural conventions, module aliases, state management patterns, and anti-vibecoding aesthetics across the TaleTranscend codebase.

## When this fires

- Developing new pages, components, services, or utilities.
- Refactoring frontend structure or styling.
- Onboarding new features into the Multi-Page Application (MPA).

## Inputs

- Source files located under `src/`.
- Configuration files: `vite.config.js`, `tailwind.config.js`, `tsconfig.json`.

## Git Safety (If Modifying Code)

- Always create a dedicated feature or chore branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Never merge to `main` without explicit user confirmation.

## Architectural Principles

1. **Multi-Page Application (MPA)**:
   - Each page is a distinct HTML document in `src/views/` mapped to dedicated logic in `src/pages/`.
   - Vanilla JavaScript with ES2022 modules.
   - Do not introduce a client-side SPA router.
2. **State Management**:
   - Uses a global mutable singleton (`appState`) and page-local state objects.
   - Direct DOM manipulation; no virtual DOM or reactive framework abstraction.
3. **TypeScript & Aliases**:
   - `@fb/*` -> `src/firebase/*`
   - `@services/*` -> `src/services/*` (including `author.service.js`, `ai.service.js`, `bookmark.service.js`, etc.)
   - `@state/*` -> `src/state/*`
   - `@ui/*` -> `src/ui/*`
   - `@pages/*` -> `src/pages/*`
   - `@config/*` -> `src/config/*`
   - `@css/*` -> `src/assets/css/*`
   - `@/*` -> `src/*`
4. **Comment & Reply Tree Architecture**:
   - Flat replies from Firestore are structured into an N-level hierarchy via `buildReplyTree()`.
   - Mentions: Child replies display stylized mention shields (`↳ @AuthorName`) with `corner-down-right` icon.
   - Connecting tree guidelines: `border-l border-white/10 hover:border-indigo-500/30` with capped responsive indentation (`pl-3 md:pl-4`) to prevent mobile layout squishing.
   - Soft-delete policy: Erased comments display `"This has been deleted by the user."` (italic slate); edit, silence, and reply triggers are removed, but all child replies remain intact.
   - Edit transparency: Edits display an `Edited` badge (`edit-3` icon) next to the timestamp.
5. **Author Role Ownership, Registration Gating & Inquire Constraints**:
   - **Publish Gating**: Unregistered authors are gated by `#author-registration-wall-modal` in the contribution atelier before manuscript publishing.
   - **Proactive Scribe Registry**: Users can proactively register/update scribe credentials on the profile page (`#author-registry-card`, `#profile-author-modal`).
   - **Author Ownership**: Author edit actions ("Edit Chronicle") must only appear if the current authenticated user matches the tale author UID (`isAuthor`).
   - **Self-Inquiry Guard**: If the author views their own tale, inquiry invitation controls (`#tab-inquire`, `#letter-tab-panel`) are hidden or guarded. Authors cannot inquire themselves.
   - **Author Badges**: Comments authored by the tale creator display an `Author` badge.
6. **Sidebar Sticky Layout & Cover Art**:
   - `<aside class="... lg:sticky lg:top-8 ...">` pins the cover art frame and combined Author Sanctuary / Inquire card to the viewport on desktop scroll.
   - Tapping the author's avatar navigates directly to `/profile.html?uid=...`.
7. **Commit Discipline**:
   - Commit changes atomically after each completed feature, fix, or turn ("commit every time").
   - Run verification (`npm run verify`) before committing to maintain a clean git history.
8. **Browser Back Button & Bfcache Interactivity Guarantee**:
   - In Multi-Page Application (MPA) navigation, page transition animations (`navigateTo`) set `document.body.style.pointerEvents = 'none'` and `opacity = '0'`.
   - When users navigate backward using browser address bar controls, browsers restore frozen DOM state from bfcache (Back/Forward Cache).
   - A global `window.addEventListener('pageshow', (e) => { ... })` handler must be registered across navigation utilities (`src/utils/navigation.ts`).
   - If `e.persisted` is true or upon any reveal initialization, `document.body.style.pointerEvents = ''` and `opacity = ''` must be unconditionally restored to prevent frozen, unresponsive pages.
9. **Scroll Container & Modal Tooltip Positioning**:
   - Interactive hover tooltips situated inside scrollable containers (`overflow-y-auto` modal bodies) must position downward (`top: calc(100% + 6px); bottom: auto; left: 0; transform: none; text-align: left;`).
   - Upward-positioned tooltips in top modal fields clip against container boundaries and disappear beneath tab bars (`Basic`, `Identity`, `Social`, `Goals`).
   - Elevate `.info-tooltip-wrap:hover, .info-tooltip-wrap:focus-within` to `z-index: 50` so disclosure overlays sit cleanly above sibling inputs.
10. **Button Rate-Limit Cooldown Protection**:

- Rate-limit countdown timers applied via `applyButtonCooldown` must only update explicit text label spans.
- Never allow countdown strings to overwrite numeric counter badges (`span[id*="count"]`) or replace icon nodes.

11. **Anti-Vibecoding & Aesthetics Standards**:

- **Zero Emojis**: Do not use emojis anywhere in UI, code, logs, comments, commit messages, or documentation. Zero exceptions.
- **Zero Glowing or Pulsing Dots**: Do not use neon green dots, pulsing indicator dots, or generic "live/online" light pips.
- **Zero Pill-Type Labels or Badges**: Do not add pill-shaped labels (`border-radius: 9999px`), floating pill tags above headings, or rounded status capsules unless explicitly requested. Use clean structural typography, technical rectangular shields, or subtle metadata text.
- **Design Token Discipline**: All color values must reference design tokens in `src/assets/css/tokens.css`. Never write raw hex or rgb literals.
- **Authentic Craft**: Eliminate generic SaaS tropes, gratuitous blur rings, and cookie-cutter purple gradients.

## Tools / Scripts to Use

- Run full verification checks:
  ```powershell
  python execution/run_verify.py
  ```
- Run interactions and profile verification:
  ```powershell
  python execution/verify_interactions_and_profile.py
  ```
- Run design token linter:
  ```powershell
  npm run lint:tokens
  ```

## Outputs

- Clean, modular code conforming to project patterns.
- Verified absence of token lint errors and linting issues.

## Edge Cases & Error Handling

- Token linter (`npm run lint:tokens`) scans all CSS and source files for hardcoded hex colors. If token check fails, replace literal colors with custom property variables (`var(--token-name)`).
- Pre-commit hook enforces formatting and linting via husky.
- Multi-reply orphaned nodes: If a reply references a deleted or missing `replyToId`, `buildReplyTree()` falls back to rendering it at the root level of the thread rather than dropping it.
