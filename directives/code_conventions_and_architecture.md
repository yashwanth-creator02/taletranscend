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
   - `@services/*` -> `src/services/*`
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
5. **Author Role Ownership & Inquire Constraints**:
   - Author edit actions ("Edit Chronicle") must only appear if the current authenticated user matches the tale author UID (`isAuthor`).
   - If the author views their own tale, inquiry invitation controls (`.chronicler-invite-card`, `#tab-btn-letter`, `#content-letter`) are hidden. Authors cannot inquire themselves.
   - Comments authored by the tale creator display an `Author` badge.
6. **Sidebar Sticky Layout & Cover Art**:
   - `<aside class="... lg:sticky lg:top-8 ...">` pins the cover art frame and combined Author Sanctuary / Inquire card to the viewport on desktop scroll.
   - Tapping the author's avatar navigates directly to `/profile.html?uid=...`. Do not introduce redundant standalone "View Profile" or duplicate "Bookmark Tale" buttons inside this card.
7. **Commit Discipline**:
   - Commit changes atomically after each completed feature, fix, or turn ("commit every time").
   - Run verification (`npm run verify`) before committing to maintain a clean git history.
8. **Anti-Vibecoding & Aesthetics Standards**:
   - **Zero Emojis**: Do not use emojis anywhere in UI, code, logs, comments, commit messages, or documentation. Zero exceptions.
   - **Zero Glowing or Pulsing Dots**: Do not use neon green dots, pulsing indicator dots, or generic "live/online" light pips.
   - **Zero Pill-Type Labels or Badges**: Do not add pill-shaped labels (`border-radius: 9999px`), floating pill tags above headings, or rounded status capsules unless explicitly requested. Use clean structural typography, technical rectangular shields, or subtle metadata text.
   - **Design Token Discipline**: All color values must reference design tokens in `src/assets/css/tokens.css`. Never write raw hex or rgb literals.
   - **Authentic Craft**: Eliminate generic SaaS tropes, gratuitous blur rings, and cookie-cutter purple gradients.

## Outputs

- Clean, modular code conforming to project patterns.
- Verified absence of token lint errors and linting issues.

## Edge Cases & Error Handling

- Token linter (`npm run lint:tokens`) scans all CSS and source files for hardcoded hex colors. If token check fails, replace literal colors with custom property variables (`var(--token-name)`).
- Pre-commit hook enforces formatting and linting via husky.
- Multi-reply orphaned nodes: If a reply references a deleted or missing `replyToId`, `buildReplyTree()` falls back to rendering it at the root level of the thread rather than dropping it.
