# TaleTranscend

> A digital library and storytelling platform for folklore, mythology, and cultural tales.

## What It Is

TaleTranscend is a browser-based platform where:
- **Readers** discover and read curated tales with a rich, customizable reader.
- **Writers** draft multi-chapter stories, publish to a public library, and receive AI-assisted suggestions.
- **Everyone** engages through bookmarks, comments, and reactions — no traditional account required (Anonymous Auth).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (ES2022 modules), Tailwind CSS |
| Build | Vite 7.x with PWA plugin |
| Backend | Firebase (Firestore, Anonymous Auth) |
| TypeScript | Utility modules (`src/utils/`) |
| Testing | Vitest (unit), Playwright (E2E) |

## Project Structure

```plain
src/
├── assets/css/          # Design tokens, themes, page styles
├── config/              # App constants, Firebase config, theme registry
├── firebase/            # Firebase SDK wrappers (auth, db, paths, refs)
├── pages/               # One directory per HTML page (MPA architecture)
│   ├── 404/             # Not-found page
│   ├── contribution/    # Editor, publish flow, chapter management
│   ├── home/            # Landing page
│   ├── library/         # Browse, filter, search tales
│   ├── login/           # Sign-in flow
│   ├── profile/         # User settings, reading stats
│   ├── reader/          # Chapter reader (themes, TTS, progress)
│   ├── shelf/           # Bookmarks and drafts dashboard
│   └── tale/            # Tale detail, comments, reactions
├── services/            # Business logic and data access
│   ├── reader/          # Progress sync, resume, read time
│   ├── tale/            # Tale fetching and pagination
│   ├── ai.service.js    # Gemini integration
│   ├── author.service.js # Author registration, status, and caching
│   ├── bookmark.service.js
│   ├── notification.service.js # Notification dispatch and real-time subscription
│   ├── profile.service.js
│   └── resonance.service.js
├── state/               # Schema factories and runtime state
│   └── schemas/         # Data shape definitions (tale, user, progress, etc.)
├── ui/components/       # Shared components (cards, nav, toast, feedback, popovers)
├── utils/               # TypeScript utilities (dom, format, sanitize, etc.)
└── views/               # HTML entry points (11 pages)
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run unit & integration tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run E2E tests (Playwright)
npm run e2e

# Lint and format
npm run lint
npm run format

# Verify no raw colour literals exist outside the design-token files
npm run lint:tokens

# Seed the 24 sample tales + chapters into Firestore (needs a configured .env;
# safe to re-run — the seeder is idempotent)
npm run seed:tales

# Run every check CI would run (format, lint, tokens, types, tests)
npm run verify
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in your Firebase project credentials.
3. Ensure Firestore composite index is deployed (see below).

## Firestore Configuration

### Database Path
All data lives under: `v1/taletranscend/projects/v1/`

### Required Composite Index
```json
{
  "collectionGroup": "tales",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "publishedAt", "order": "DESCENDING" }
  ]
}
```
**Deploy:** `firebase deploy --only firestore:indexes`

### Security Rules
Rules are defined in `firestore.rules`.
> **Note:** Current rules use test-mode logic. Ensure production-ready rules are deployed before launch.

## Architecture Notes
- **Multi-Page Application (MPA):** Each page is a separate HTML file bundled by Vite. No client-side SPA router.
- **State Management:** Global mutable singleton (`appState`) + page-local state objects. No reactive framework (direct DOM manipulation).
- **Navigation & Bfcache Guarantee:** Page transition system (`src/utils/navigation.ts`) binds a global `pageshow` listener to guarantee pointer events and opacity are unconditionally restored when navigating backward via browser address bar controls.
- **Firebase Anonymous Auth:** Every visitor gets a persistent, anonymous UID.
- **Design Tokens:** Strict single-source palette in `src/assets/css/tokens.css` enforced by `npm run lint:tokens`. Zero raw colour literals.
- **Single-Page Footer Isolation:** Only the home page (`src/views/index.html`) contains a site footer; inner views rely on the global navigation header (`app-nav`) and mobile dock.
- **Brand Emblem Suite:** The mythical golden quill pen is the official brand emblem across header, home footer, auth, boot curtains, and social graph cards (`public/logo.png`, `logo-wide.png`, `icon.svg`, `apple-touch-icon.png`, `favicon.ico`).
- **Hierarchical Routing & Discoverability:** Canonical clean URLs (`/tales/:id`, `/tales/:id/read/:chapter`, `/toc`) supported across Vite and Firebase with dynamic XML and HTML sitemaps.
- **Reader Text Highlighting & Quote Share Cards:** Highlighted passages are marked directly in the reader view with theme-aware accent colors and smooth scroll-to-jump navigation; readers can generate luxury editorial quote share cards with tale cover art backgrounds and copyable quotes.
- **Image Storage:** Cover images use external URLs with subtle 8px backdrop blurring.

## Agent Architecture & Directives
TaleTranscend adopts the 3-Layer Architecture (`directives/`, `execution/`, `.tmp/`):
- **Layer 1 (Directives):** Standard operating procedures in `directives/`:
  - `accessibility_and_ui_standards.md`: Single-page footer isolation, accessible toasting, keyboard navigation (`Ctrl+K`, `Ctrl+A`), and brand quill assets.
  - `author_registration_and_correspondence.md`: Scribe registry, publication gating wall, and reader missives.
  - `code_conventions_and_architecture.md`: MPA conventions, bfcache restoration, tooltip standards, rate limiting, and core guidelines.
  - `deploy_application.md`: Production build and Firebase/Vercel deployment workflows.
  - `developer_verification.md`: Mandatory formatting, token linting, TypeScript, and testing pipeline.
  - `firestore_management.md`: Firestore indexes, database paths, and collection schemas.
  - `mcp_servers.md`: Project-local MCP server setup for Chrome DevTools debugging and Firebase project access.
  - `navigation_routing_and_sitemaps.md`: Hierarchical clean URLs, `resolveHref` asset safety, XML sitemap, and Table of Contents (Living Codex).
  - `profile_and_oracle_ai.md`: Chronicler profile, client-side Gemini API key storage, Oracle AI, and non-clipping tooltips.
  - `tale_interactions_and_comments.md`: Consolidated hero action deck, red soul resonance, fragment progress/downloads, and comments.
- **Layer 2 (Orchestration):** Agent operating instructions in `AGENTS.md`.
- **Layer 3 (Execution):** Deterministic execution scripts in `execution/`:
  - `run_verify.py`: Full test suite, format check, token check, linter, and type-check runner.
  - `verify_author_flows.py`: Author registration and inquiry verification suite.
  - `verify_interactions_and_profile.py`: Hero interactions, soul resonance, bfcache navigation, and profile suites.
  - `verify_navigation_and_ui.py`: Navigation, hierarchical routing, footer isolation, brand emblem assets, and UI test suite.
- **Skills:** Reusable agent skills located in `agents/skills/` synchronized with `brand-leo-utils`.

## License
MIT

