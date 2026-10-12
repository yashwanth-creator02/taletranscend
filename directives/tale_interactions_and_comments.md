# Directive: Tale Interactions, Comments, and Sidebar Architecture

## Goal

Define the standard operating procedures, data structures, and UI behaviors for tale-level user interactions: soul resonance, shelf management, sharing, comment and reply trees, inline editing, soft deletion, and the author sanctuary sidebar.

## When this fires

- Implementing or updating tale page hero buttons (resonance, shelf, share, edit).
- Modifying comment submission, editing, soft deletion, or reply threading.
- Adjusting author profile navigation, author sanctuary card, or sticky column layouts.
- Debugging Firestore security rules for comments, replies, or resonance collections.

## Inputs

- Tale ID (`taleId`) and current authenticated user UID (`auth.currentUser.uid`).
- Tale document containing metadata (`authorId`, `authorUID`, `resonanceCount`, etc.).
- Active design tokens in `src/assets/css/tokens.css`.

## Git Safety (If Modifying Code)

- Branch creation requirement: Always work on a dedicated branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` require explicit user consent in conversation.

## Standard Operating Procedures

### 1. Tale Hero Actions, Backdrop & Metadata

- **Hero Cover Art Backdrop**:
  - Render cover artwork behind the hero container inside `.hero-cover-backdrop-img`.
  - Subtle blur standard: `filter: blur(8px) brightness(0.42) saturate(1.25)` with `scale(1.05)` and `inset: -12px`.
  - Never apply heavy 32px blur smears that destroy artwork recognition.
- **Metadata Deck**:
  - Frosted pills row displaying Author avatar chip, live status pill (`display-status-pill`), fragment count (`display-chapters`), and estimated read time (`read-time`).
  - Status indicator dot (`display-status-dot`): Dynamically styled based on tale status (`emerald-400` for Ongoing, `amber-400` for Hiatus, `rose-400` for Stopped, `sky-400`/`indigo-400` for Completed).
- **Consolidated Hero Action Deck**:
  - **Desktop (`lg+`)**: Unified single-row action deck combining:
    - Primary CTA: `start-btn-desktop` ("Initiate Reading", indigo-to-violet gradient).
    - Secondary CTA: `resume-btn-desktop` ("Resume", frosted glass).
    - Soul Resonance: `resonance-btn-desktop` (Heart icon + `#resonance-count`, glass pill).
    - Shelf: `shelf-btn-desktop` ("Save to Shelf", glass pill).
    - Share: `share-btn-desktop` ("Share", glass pill).
    - Do not render redundant separate "Soul Resonance Hearth" card boxes in the hero section.
  - **Mobile (`< lg`)**: Balanced two-tier grid:
    - Top tier: 2 equal-width columns for `start-btn` ("Initiate") and `resume-btn` ("Resume").
    - Bottom tier: 3 equal-width columns for `resonance-btn-mobile` (Heart + count), `shelf-btn` ("Shelf"), and `share-btn` ("Share").
- **Soul Resonance Standard**:
  - Document path: `v1/taletranscend/projects/v1/reactions/${taleId}_${userId}`.
  - **No Verbose Status Labels**: Omit text like "Align Souls" or "Souls Aligned" from the hero button. The button renders strictly the heart icon and the resonance count.
  - **Aligned State**: When souls are aligned (`active: true`), the button displays full red styling:
    - Icon: `text-red-500 fill-red-500` (solid filled red heart).
    - Button: `border-color: rgb(var(--danger-rgb) / var(--a-60))`, `background: rgb(var(--danger-rgb) / var(--a-16))`, `color: rgb(var(--danger-rgb))`, and crimson shadow.
  - **Cooldown Protection**: `applyButtonCooldown` must only target dedicated label spans, never overwriting numeric count elements (`span[id*="count"]`).
  - Optimistic UI update: Toggle resonance state and counter locally immediately upon click. Revert on failure with user toast.
- **Shelf Management**:
  - Add or remove tale from user shelf/reading list with optimistic feedback.
- **Share Action**:
  - If `navigator.share` is supported by the browser, invoke native sharing with title and URL.
  - Otherwise, copy URL to clipboard and show confirmation toast.
- **Edit Chronicle / Tale Control**:
  - Only render the "Edit Tale" or "Edit Chronicle" button if `auth.currentUser.uid === tale.authorId` (or `tale.authorUID`). Readers must never see edit controls.

### 2. Fragment Reading Progress, Manual Toggles & Downloads

- **Manual Fragment Read/Unread Toggles**:
  - Each fragment item in `#chapter-list` provides discrete read/unread triggers (`data-action="mark-read"`, `data-action="mark-unread"`).
  - Updates local progress cache (`markChapterRead`, `markChapterUnread`) and syncs to cloud progress service when authenticated (`syncMarkChapterRead`, `syncMarkChapterUnread`).
- **Fragment & Chronicle Downloads**:
  - Single Fragment Download: Triggered by `data-action="download-chapter"` via `downloadChapter(taleId, chapterIndex, options)`. Exports markdown/text document of the individual fragment.
  - Full Chronicle Download: Triggered by `#btn-download-all-chronicles` via `downloadChronicle(taleId, options)`. Exports the complete compiled chronicle.
- **Chronicle Batch Actions**:
  - Chronicle TOC header provides batch actions:
    - `#btn-mark-all-read`: Marks all fragments as read in local storage and cloud progress.
    - `#btn-mark-all-unread`: Resets all fragment read states to unread.
    - `#btn-download-all-chronicles`: Initiates comprehensive offline download.

### 3. Comment & Reply Tree Architecture

- **Data Storage**:
  - All comments and replies live under `v1/taletranscend/projects/v1/tales/${taleId}/comments`.
  - Root comments: `parentId: null` or omitted.
  - Replies: `parentId: rootCommentId`, `replyToId: immediateCommentOrReplyId`, `replyToAuthorName: string`.
  - Security Rules requirement: All replies under a comment must adhere to Firestore rules validating that `parentId` matches the parent chain.
- **Tree Construction**:
  - Retrieve comments for the tale ordered by creation timestamp.
  - Group into a hierarchy using `buildReplyTree(comments)`.
  - Render replies nested beneath parent nodes using structural indentation (`pl-3 md:pl-4`).
- **Mention Indicators**:
  - When rendering a nested reply, display a technical `@RecipientName` badge to identify conversational context.
- **Author Recognition**:
  - Comments authored by the tale creator display a subtle rectangular `(author)` shield next to the author name.
- **Inline Comment Editing**:
  - Comments can be edited by their original author.
  - Renders inline textarea with save and cancel buttons.
  - Updates Firestore document: `text: updatedText`, `isEdited: true`, `editedAt: serverTimestamp()`.
  - Displayed with a technical, subdued `(edited)` text indicator.
- **Soft Deletion**:
  - Comments are never silently erased or hard-deleted if replies may exist.
  - Firestore payload: `text: ''`, `isDeleted: true`, `deletedAt: serverTimestamp()`.
  - UI representation: Displays "This comment has been deleted by the user." in muted, italic typography.
  - Action buttons (reply, edit, delete) are hidden on soft-deleted comments, but the child reply tree remains intact.
- **Reader Page Discussion Features**:
  - Timestamps: Always render both formatted date and time (`MMM D, YYYY at h:mm A`) using `formatCommentDateTime(at)`.
  - Likes: Optimistic like toggle backed by subcollection doc `comments/{commentId}/likes/{uid}` and `likeCount` atomic increment/decrement on the comment or reply.
  - Replies: Nested reply form toggled via Reply trigger, saving to child replies subcollection or tree.
  - Badges: Rectangular technical `Author` and `Edited` badges (`edited-badge`) adhering to anti-vibecoding guidelines (no pill styling).

### 4. Sidebar, Author Sanctuary, and The Chronicler's Letter

- **Layout Structure**:
  - Positioned beneath the Sticky Hanging Cover Art column (`sticky top-24`).
  - Combines author identity with connect/inquire functionality.
- **Navigation**:
  - Clicking the author avatar or "View Profile" navigates to `/profile.html?uid=${tale.authorId || tale.authorUID}`.
- **The Chronicler's Letter Tab**:
  - Located on the tale page under `#tab-inquire` (`data-tab="inquire"`) activating `#letter-tab-panel`.
  - Replaces legacy newsletter subscription with reader inquiries across 4 categories: Lore & World, Character Doubts, Plot & Theories, and Connect & Praise.
  - Missives are routed to the author's registered correspondence inbox (`v1/taletranscend/projects/v1/tales/${taleId}/inquiries`).
  - Provides a direct mail action button (`#letter-author-email-btn`) linking directly to `mailto:${authorEmail}`.
- **Self-Inquiry Guard**:
  - If the viewing user is the tale author (`auth.currentUser.uid === tale.authorId`), hide `#tab-inquire` or disable inquiry submissions. Authors cannot inquire themselves.
- **Consolidation**:
  - Bookmark controls reside in the hero interaction bar and the author sanctuary card.
- **Reference**:
  - See `directives/author_registration_and_correspondence.md` for full registration wall and correspondence procedures.

### 5. Anti-Vibecoding & Aesthetics Compliance

- **Zero Emojis**: Never use emojis in button labels, badges, comment placeholders, or toasts.
- **Zero Pill Badges**: Use structural rectangular shields (`rounded-sm` or sharp geometry) rather than pills (`rounded-full`).
- **Zero Glowing/Pulsing Dots**: Status and role indicators must use clean typographic labels.
- **Design Tokens**: All background, text, border, and accent colors must reference CSS variables in `tokens.css`.

## Tools / Scripts to Use

- Run full verification suite:
  ```powershell
  python execution/run_verify.py
  ```
- Run interactions and profile verification:
  ```powershell
  python execution/verify_interactions_and_profile.py
  ```
- Run targeted interaction tests:
  ```powershell
  npx vitest run src/pages/tale/__tests__/interactions.test.js
  npx vitest run src/pages/tale/__tests__/ui.test.js
  npx vitest run src/services/tale/__tests__/downloadTale.test.js
  ```

## Outputs

- Properly configured tale hero section with subtle blurred cover backdrop and balanced action pills.
- Solid red soul resonance indicator with zero status text on click.
- Interactive fragment read/unread toggles and offline export downloads.
- Modular comment tree with verified author recognition and soft-deletion behavior.

## Edge Cases & Error Handling

- **Anonymous Auth Delay**: Ensure `auth.currentUser` is resolved before executing reactions or comments.
- **Network Disconnections**: Rollback optimistic state gracefully if Firestore writes fail.
- **Deep Threading Mobile Overflow**: Limit horizontal indentation or collapse excessive reply depths to maintain readability on small screens.
