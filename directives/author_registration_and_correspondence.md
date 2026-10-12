# Directive: Author Registration Wall, Scribe Registry, and Chronicler Missives

## Goal

Define the standard operating procedures, data contracts, and UI behaviors for author registration, scribe identity management, publication gating in the contribution atelier, and reader inquiry correspondence via The Chronicler's Letter on the tale page.

## When this fires

- Modifying the tale publication pipeline or gating logic in the contribution atelier (`src/pages/contribution/publish.js`, `src/views/contribution.html`).
- Adjusting author identity, pen name, or correspondence email in user profiles (`src/pages/profile/`, `src/views/profile.html`).
- Updating "The Chronicler's Letter" tab, reader inquiries form, or author contact display on the tale page (`src/pages/tale/inquire.js`, `src/views/tale.html`).
- Modifying author validation schemas, `author.service.js`, or the `inquiries` Firestore subcollection.

## Inputs

- Authenticated user UID (`auth.currentUser.uid`) or target author ID (`tale.authorId`).
- Author registration parameters: `penName` (string, 2-80 chars), `authorEmail` (valid email, max 100 chars), optional `authorBio` (string, max 500 chars).
- Reader inquiry parameters: `readerName` (string, 1-80 chars), optional `readerContact` (string, max 100 chars), `category` (enum: `'lore'`, `'character'`, `'plot'`, `'connect'`), `message` (string, 10-800 chars).
- Design tokens defined in `src/assets/css/tokens.css`.

## Git Safety (If Modifying Code)

- Branch creation requirement: Always work on a dedicated branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` require explicit user consent in conversation.

## Standard Operating Procedures

### 1. Author Registration Wall (Contribution Atelier)

- **Gating Point**:
  - Before writing or updating a tale in `publishFullTale()`, after local title and chapter content validation, query the user's author status via `getAuthorStatus(userId)`.
  - If `!authorStatus.isAuthor || !authorStatus.authorEmail`, suspend publication and display `#author-registration-wall-modal`.
- **Wall Modal UX**:
  - Displays technical shield badge `Scribe Registry Required` and title `Author Registration Wall`.
  - Collects `wall-pen-name` (required, min 2 chars), `wall-author-email` (required, valid email), and optional `wall-author-bio`.
  - Provides `btn-cancel-wall` to safely abort publishing with an informational toast.
  - Submitting validates input against `AuthorRegistrationSchema`. On success, calls `registerAuthor(userId, data)`.
  - Closes modal, invalidates caches, and resumes publishing pipeline automatically.
- **Tale Record Stamping**:
  - Both new tale creation and existing tale update payloads must stamp `authorEmail: authorStatus.authorEmail` and `authorName: authorStatus.penName || state.authorName`.

### 2. Proactive Scribe Registry (User Profile)

- **Identity Pillar Placement**:
  - Located within the Identity Pillar column in `src/views/profile.html` (`#author-registry-card`).
  - Displays dynamic state:
    - Unregistered: `READER` status badge, explanatory description, and `REGISTER AS SCRIBE` button (`#author-register-btn`).
    - Registered: `VERIFIED SCRIBE` status badge, active pen name, contact email pill (`#author-email-display`), creed summary, and `UPDATE SCRIBE REGISTRY` button (`#author-edit-btn`).
- **Profile Modal Flow**:
  - Triggering either button opens `#profile-author-modal`.
  - Form `#profile-author-form` pre-fills existing values from `profileState`.
  - Submission calls `saveAuthorRegistry(authorData)` in `sync.js`, updating both Firestore user record and local profile state.
  - Closes modal and issues confirmation toast without requiring full page reload.

### 3. The Chronicler's Letter (Tale Archive & Inquiries)

- **Location & Navigation**:
  - Resides exclusively on the tale page under `#tab-inquire` (`data-tab="inquire"`) and panel `#letter-tab-panel`.
  - Completely detached from chapter reading views (removed from `reader.html`).
- **Self-Inquiry Guard**:
  - If the viewing user is the author of the tale (`userId === tale.authorId` or `tale.authorUID`), hide inquiry tab controls (`#tab-inquire`) or render a self-management notice. Authors cannot dispatch missives to themselves.
- **Inquiry Categories**:
  - Radio pills: `Lore & World` (`'lore'`), `Character Doubts` (`'character'`), `Plot & Theories` (`'plot'`), `Connect & Praise` (`'connect'`).
- **Correspondence Routing**:
  - Informational pill and banner inform readers: `"Missives are routed to the author's registered correspondence inbox."`
  - Form displays `#inquire-author-email-pill` showing destination author correspondence email if public.
  - Author bio card displays direct `mailto:` action button (`#letter-author-email-btn`), linking to `mailto:${authorEmail}?subject=...`.
- **Data Persistence**:
  - Inquiry missives write to Firestore subcollection:
    `v1/taletranscend/projects/v1/tales/${taleId}/inquiries`
  - Document fields:
    - `taleId`: string
    - `taleTitle`: string
    - `authorId`: string
    - `authorName`: string
    - `authorEmail`: string
    - `readerId`: string
    - `readerName`: string
    - `readerContact`: string
    - `category`: string
    - `message`: string
    - `status`: `'unread'`
    - `createdAt`: ISO timestamp

### 4. Shared Services, Caching & Fallback Tolerance

- **Author Service (`src/services/author.service.js`)**:
  - `getAuthorStatus(userId)`: Reads from memory cache (`user:author-status:${userId}`), falling back to Firestore user profile document, then local storage key `author_registry_${userId}`.
  - `registerAuthor(userId, registrationData)`: Validates via `AuthorRegistrationSchema`, writes to Firestore user doc, backs up to local storage, and invalidates both `user:author-status:${userId}` and `user:profile:${userId}` cache entries.
- **Anti-Vibecoding & Aesthetics**:
  - Zero emojis in all form labels, buttons, toasts, and status indicators.
  - Zero pill badges; use sharp or technical shields (`rounded-lg`, `rounded-xl`).
  - Single-source colors: all styles reference CSS custom properties in `tokens.css`.

## Tools / Scripts to Use

- Run author suite verification:
  ```powershell
  python execution/verify_author_flows.py
  ```
- Or run targeted Vitest test suites:
  ```powershell
  npx vitest run src/services/__tests__/author.service.test.js src/pages/tale/__tests__/inquire.test.js src/pages/contribution/__tests__/publish.test.js src/pages/profile/__tests__/sync.test.js
  ```

## Outputs

- Gated tale publishing preventing unverified manuscripts.
- Persistent author correspondence records in Firestore.
- Complete unit test coverage across all registration, profile sync, and inquiry suites.

## Edge Cases & Error Handling

- **Missing Author Email on Existing Tales**: In `inquire.js`, if a tale document lacks `authorEmail`, asynchronously fetch `getAuthorStatus(tale.authorId)` to hydrate the email pill and mailto button dynamically.
- **Offline Author Registration**: If offline, `registerAuthor` persists author details to local storage and allows the session to proceed gracefully.
- **Cache Invalidation**: Always delete cached author status (`cacheService.delete`) and profile (`cacheService.invalidateProfile`) immediately upon registration update so downstream views reflect updated credentials.
- **Character Counter**: Real-time counter on the missive textarea alerts readers when reaching the 800-character ceiling.
