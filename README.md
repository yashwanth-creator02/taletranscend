# TaleTranscend

> A digital library and storytelling platform for folklore, mythology, and cultural tales.

## What It Is

TaleTranscend is a browser-based platform where:
- **Readers** discover and read curated tales with a rich, customizable reader.
- **Writers** draft multi-chapter stories, publish to a public library, and receive AI-assisted suggestions.
- **Guests** read every public tale without an account; **registered readers** comment, react, bookmark across devices, and publish. Anonymous sessions are read-only for content and contributions.

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
│   ├── 404/             # Not-found page, including page reporting
│   ├── admin/           # Claim-gated moderation and operations dashboard
│   ├── contribution/    # Editor, publish flow, chapter management
│   ├── home/            # Landing page
│   ├── library/         # Browse, filter, search tales
│   ├── login/           # Sign-in flow
│   ├── profile/         # User settings, reading stats
│   ├── reader/          # Chapter reader (themes, TTS, progress)
│   ├── settings/        # Preferences, accounts, support and report history
│   ├── shelf/           # Bookmarks and drafts dashboard
│   └── tale/            # Tale detail, comments, reactions, reporting
├── services/            # Business logic and data access
│   ├── admin/           # Staff-only access, moderation, reporting, audit
│   ├── reader/          # Progress sync, resume, read time
│   ├── tale/            # Tale fetching and pagination
│   ├── ai.service.js    # Gemini integration
│   ├── author.service.js # Author registration, status, and caching
│   ├── bookmark.service.js
│   ├── moderation.service.js # Soft deletion, restore, purge, bulk removal
│   ├── notification.service.js # Notification dispatch and real-time subscription
│   ├── profile.service.js
│   ├── report.service.js # Contextual reports and reporter-safe history
│   └── resonance.service.js
├── state/               # Schema factories and runtime state
│   └── schemas/         # Data shape definitions (tale, user, progress, etc.)
├── ui/components/       # Shared components (cards, nav, toast, feedback, report dialog)
├── utils/               # TypeScript utilities (dom, format, sanitize, etc.)
└── views/               # HTML entry points (12 pages)
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
3. Deploy the Firestore rules and composite indexes (see below).

## Firestore Configuration

### Database Path
All data lives under: `v1/taletranscend/projects/v1/`

### Rules and Indexes
`firestore.rules` is the production-grade authority for every write. It enforces
registered-user contributions, author ownership, administrator-only tale
removal, staff-only moderation, reporter-owned report history, staff-only
private notes and moderation archives, and append-only audit logs.

`firestore.indexes.json` is the single source of truth for composite indexes.
It covers public tale feeds, comments, reader aids, admin queues, report history,
soft-deletion registry filters, and admin prefix search. Deploy both together:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

A missing index is invisible until the query runs, so any new `where` + `orderBy`
or multi-field query must add its index in the same change. The rules emulator
suite (`npm run test:rules`) verifies the security model before deployment.

### Moderation and Support Collections
- `reports/{reportId}` — staff-visible report records with contextual target,
  category, description, status, responses, and reviewer metadata.
- `reportHistory/{reportId}` — reporter-safe mirror containing status and
  user-visible responses only; never private staff notes.
- `reportPrivateNotes/{reportId}` — staff-only triage notes.
- `softDeletions/{registryId}` — cursor-friendly registry of removed tales,
  comments, and replies, including restore/purge state and audit metadata.
- `moderationArchive/{registryId}` — staff-only archived text for removed
  comments and replies so public text can be cleared without losing evidence.

Soft-deleted tales keep their documents, IDs, chapters, and relationships. They
set `isDeleted`, `deletedAt`, `deletedBy`, `deletionType`, `deletionReason`,
`moderationCategory`, `previousStatus`, and `previousVisibility`, and move to
`status: 'deleted'` / `visibility: 'private'`. Public listings and direct reads
reject them; administrators can restore or permanently remove them from the
Deletions workspace.

## Architecture Notes
- **Multi-Page Application (MPA):** Each page is a separate HTML file bundled by Vite. No client-side SPA router.
- **State Management:** Global mutable singleton (`appState`) + page-local state objects. No reactive framework (direct DOM manipulation).
- **Navigation & Bfcache Guarantee:** Page transition system (`src/utils/navigation.ts`) binds a global `pageshow` listener to guarantee pointer events and opacity are unconditionally restored when navigating backward via browser address bar controls.
- **Firebase Anonymous Auth:** Every visitor gets a persistent anonymous UID for reading progress and bookmarks. Guests are read-only; content and contribution writes require a registered account (`isRegistered()` in `firestore.rules`, `src/services/auth.guard.js` in the UI).
- **Design Tokens:** Strict single-source palette in `src/assets/css/tokens.css` enforced by `npm run lint:tokens`. Zero raw colour literals.
- **Single-Page Footer Isolation:** Only the home page (`src/views/index.html`) contains a site footer; inner views rely on the global navigation header (`app-nav`) and mobile dock.
- **Brand Emblem Suite:** The mythical golden quill pen is the official brand emblem across header, home footer, auth, boot curtains, and social graph cards (`public/logo.png`, `logo-wide.png`, `icon.svg`, `apple-touch-icon.png`, `favicon.ico`).
- **Hierarchical Routing & Discoverability:** Canonical clean URLs (`/tales/:id`, `/tales/:id/read/:chapter`, `/toc`) supported across Vite and Firebase with dynamic XML and HTML sitemaps.
- **Reader Text Highlighting & Quote Share Cards:** Highlighted passages are marked directly in the reader view with theme-aware accent colors and smooth scroll-to-jump navigation; readers can generate luxury editorial quote share cards with tale cover art backgrounds and copyable quotes.
- **Moderation Without Data Loss:** Tales, comments, and replies use soft deletion. Public surfaces hide removed content while preserving documents, IDs, relationships, and staff-only archives for review and restore. Permanent removal is a separate, administrator-confirmed action in Deletions.
- **Contextual Reporting:** Registered readers can report tales, comments, replies, broken pages, and the website from the surface where the problem occurs. Reports are prefilled from context but remain editable, and reporters can follow Submitted, Under Review, Responded, Resolved, and Closed states in Settings.
- **Support Inbox:** Administrator responses and direct staff messages arrive through the existing notification inbox. Reporter history never exposes private staff notes, and cross-user reads are denied by rules.
- **Image Storage:** Cover images use external URLs with subtle 8px backdrop blurring.

## Agent Architecture & Directives
TaleTranscend adopts the 3-Layer Architecture (`directives/`, `execution/`, `.tmp/`):
- **Layer 1 (Directives):** Standard operating procedures in `directives/`:
  - `accessibility_and_ui_standards.md`: Single-page footer isolation, accessible toasting, keyboard navigation (`Ctrl+K`, `Ctrl+A`), report and guideline dialog focus behavior, and brand quill assets.
  - `author_registration_and_correspondence.md`: Scribe registry, publication gating wall, and reader missives.
  - `code_conventions_and_architecture.md`: MPA conventions, bfcache restoration, tooltip standards, rate limiting, and core guidelines.
  - `deploy_application.md`: Production build and Firebase/Vercel deployment workflows.
  - `developer_verification.md`: Mandatory formatting, token linting, TypeScript, and testing pipeline.
  - `firestore_management.md`: Firestore indexes, database paths, soft-deletion/reporting collections, and schema rules.
  - `mcp_servers.md`: Project-local MCP server setup for Chrome DevTools debugging and Firebase project access.
  - `navigation_routing_and_sitemaps.md`: Hierarchical clean URLs, `resolveHref` asset safety, XML sitemap, and Table of Contents.
  - `profile_and_google_api_key.md`: Chronicler profile, client-side Gemini API key storage, Google API key features, and non-clipping tooltips.
  - `tale_interactions_and_comments.md`: Consolidated hero action deck, red soul resonance, fragment progress/downloads, comments, guidelines, and contextual reporting.
- **Layer 2 (Orchestration):** Agent operating instructions in `AGENTS.md`.
- **Layer 3 (Execution):** Deterministic execution scripts in `execution/`:
  - `run_verify.py`: Full test suite, format check, token check, linter, and type-check runner.
  - `verify_author_flows.py`: Author registration and inquiry verification suite.
  - `verify_interactions_and_profile.py`: Hero interactions, soul resonance, bfcache navigation, and profile suites.
  - `verify_navigation_and_ui.py`: Navigation, hierarchical routing, footer isolation, brand emblem assets, and UI test suite.
- **Skills:** Reusable agent skills located in `.agents/skills/` synchronized with `brand-leo-utils`.

## License
MIT

