# TaleTranscend

> A digital library and storytelling platform for folklore, mythology, and cultural tales.

## What It Is

TaleTranscend is a browser-based platform where:

- **Readers** discover and read curated tales with a rich, customizable reader.
- **Writers** draft multi-chapter stories, publish to a public library, and receive AI-assisted suggestions.
- **Everyone** engages through bookmarks, comments, and reactions — no traditional account required (Anonymous Auth).

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | Vanilla JavaScript (ES2022 modules), Tailwind CSS |
| Build      | Vite 7.x with PWA plugin                          |
| Backend    | Firebase (Firestore, Anonymous Auth, Storage)     |
| TypeScript | Utility modules (`src/utils/`)                    |
| Testing    | Vitest (unit), Playwright (E2E)                   |

## Project Structure

```plain
src/
├── assets/css/          # Design tokens, themes, page styles
├── config/              # App constants, Firebase config, theme registry
├── firebase/            # Firebase SDK wrappers (auth, db, paths, refs)
├── pages/               # One directory per HTML page (MPA architecture)
│   ├── contribution/    # Editor, publish flow, chapter management
│   ├── home/            # Landing page
│   ├── library/         # Browse, filter, search tales
│   ├── profile/         # User settings, reading stats
│   ├── reader/          # Chapter reader (themes, TTS, progress)
│   ├── shelf/           # Bookmarks and drafts dashboard
│   └── tale/            # Tale detail, comments, reactions
├── services/            # Business logic and data access
│   ├── reader/          # Progress sync, resume, read time
│   ├── tale/            # Tale fetching and pagination
│   ├── ai.service.js    # Gemini integration
│   ├── bookmark.service.js
│   ├── profile.service.js
│   └── resonance.service.js
├── state/               # Schema factories and runtime state
│   └── schemas/         # Data shape definitions (tale, user, progress, etc.)
├── ui/components/       # Shared components (cards, nav, toast, feedback)
├── utils/               # TypeScript utilities (dom, format, sanitize, etc.)
└── views/               # HTML entry points (7 pages)
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
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your Firebase project credentials.
3. Ensure Firestore composite index is deployed (see below).

## Firestore Configuration

### Database Path

All data lives under: `v1/taletranscend/projects/v1/` (kept as-is by design — see
`docs/MIGRATION_PLAN.md`).

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

**Deploy:** `firebase deploy --only firestore:indexes` (index file now lives at
`firestore/firestore.indexes.json`)

### Security Rules

Rules are defined in `firestore/firestore.rules` (moved from the repo root as of Phase 2 —
see `docs/MIGRATION_PLAN.md`). As of Phase 2, the rules are nested under the same
`v1/taletranscend/projects/v1/` prefix the app actually writes to, closing the mismatch that
used to send every real read/write to the file's `deny all` fallback. Run `npm run test:rules`
(requires a local Java runtime for the Firestore emulator) before deploying rule changes —
that command runs `firestore/tests/rules.emulator.test.ts` against a real emulator, which is
the only reliable way to verify rule behavior.

> **Known gap:** `public/meta/featured` and `public/meta/stats` are defined in
> `src/firebase/paths.js` with an odd number of path segments, but `refs.js` reads them with
> `doc()`, which requires an even number — this likely throws a real runtime error today,
> independent of the rules themselves. Not fixed as part of Phase 2, since it's a data-model
> question rather than a rules question.

## Architecture Notes

- **Multi-Page Application (MPA):** Each page is a separate HTML file bundled by Vite. No client-side SPA router.
- **State Management:** Global mutable singleton (`appState`) + page-local state objects. No reactive framework (direct DOM manipulation).
- **Firebase Anonymous Auth:** Every visitor gets a persistent, anonymous UID.
- **Image Storage:** Cover images currently use external URLs.

## License

MIT
