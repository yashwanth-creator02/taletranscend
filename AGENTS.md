# TaleTranscend Agent Guidance

This document provides high-signal instructions for OpenCode sessions to quickly understand and work within the TaleTranscend repository.

## Project Overview

- **Architecture**: Multi-Page Application (MPA) using Vanilla JavaScript (ES2022 modules), Tailwind CSS, and Vite. No client-side SPA router.
- **Backend**: Firebase (Firestore, Anonymous Auth).
- **State Management**: Uses a global mutable singleton (`appState`) and page-local state objects with direct DOM manipulation.
- **Image Storage**: Cover images currently use external URLs.
- **Authentication**: Firebase Anonymous Auth is used, providing a persistent anonymous UID to every visitor.

## Developer Commands

- **Install Dependencies**: `npm install`
- **Start Dev Server**: `npm run dev`
- **Build for Production**: `npm run build`
- **Run Unit/Integration Tests**: `npm test`
- **Run E2E Tests (Playwright)**: `npm run e2e`
- **Lint**: `npm run lint`
- **Lint Design Tokens**: `npm run lint:tokens` (fails on any raw colour literal outside `tokens.css`)
- **Format**: `npm run format`
- **Run All Checks (Format, Lint, Tokens, Types, Tests)**: `npm run verify`
- **Type Check**: `npm run type-check`

## Environment Setup

1.  **Configuration**: Copy `.env.example` to `.env` and fill in Firebase project credentials.
2.  **Firestore Index**: Deploy the required composite index using `firebase deploy --only firestore:indexes`. The index definition is in `firestore.indexes.json`.
3.  **Firestore Rules**: Security rules are defined in `firestore.rules`. **Note:** Current rules use test-mode logic; ensure production-ready rules before deployment.
4.  **Firestore Database Path**: All application data resides under `v1/taletranscend/projects/v1/`.

## Code Structure & Conventions

- **TypeScript Aliases**:
  - `@fb/*`: `src/firebase/*`
  - `@services/*`: `src/services/*`
  - `@state/*`: `src/state/*`
  - `@ui/*`: `src/ui/*`
  - `@pages/*`: `src/pages/*`
  - `@config/*`: `src/config/*`
  - `@css/*`: `src/assets/css/*`
  - `@/*`: `src/*`
- **Directory Ownership**:
  - `src/pages/`: Contains separate directories for each HTML page, reflecting the MPA architecture.
  - `src/firebase/`: Firebase SDK wrappers.
  - `src/services/`: Business logic and data access.
  - `src/utils/`: TypeScript utility modules.
- **Pre-commit Hooks**: Husky is configured (`package.json`, `prepare` script) to run linting and formatting on staged files using `lint-staged`.

<!-- brand-leo-utils:skill-sync:start -->

## Skills (brand-leo-utils)

This project's skills live in `agents/skills/` — gitignored here. The
brand-leo-utils repo is the source of truth; this folder is a disposable
local copy, and it belongs to whichever agent is handling the session,
not one specific tool.

- To load or refresh skills from brand-leo-utils, follow its
  `directives/instantiate_project_skills.md`.
- If you create or edit a skill under `agents/skills/`, it isn't done
until it's synced back: follow brand-leo-utils's
`directives/sync_skill_to_brand.md`. Both directives branch first,
never commit to main/master directly, and only reach main via a
pull request or an explicit, separate go-ahead from the user.
<!-- brand-leo-utils:skill-sync:end -->
