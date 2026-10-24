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
  - **Cover Shelf Shortcut**: the hero cover column carries a secondary "View Shelf" link (`#view-shelf-btn`, `href="shelf.html"`) directly beneath the cover art, stretched to the cover width.
    - Visibility is controlled through `[data-shelf-link]` (`#view-shelf-wrap`) toggling the `hidden` class: shown only when the tale is confirmed on the visitor's shelf (already saved on load, or a successful add), hidden again after a successful removal.
    - The bookmark state is preloaded with tale hydration and passed as the fifth argument to `setupShelfButton`, so the shortcut renders before the first page reveal. Keep this preload when refactoring the page bootstrap; do not reintroduce a post-reveal read.
    - Offline add/remove resolves `null` from the bookmark service. Treat it as failure: never reveal or hide the shortcut on an unconfirmed write.
    - On `pageshow` with `persisted: true` (bfcache restore), `setupShelfButton` revalidates `isBookmarked` and refreshes both the shelf buttons and the shortcut.
    - The link's accessible name is its visible text ("View Shelf"). Do not add an aria-label that differs from it.
- **Share Action**:
  - If `navigator.share` is supported by the browser, invoke native sharing with title and URL.
  - Otherwise, copy URL to clipboard and show confirmation toast.
- **Edit Chronicle / Tale Control**:
  - Only render the "Edit Tale" or "Edit Chronicle" button if `auth.currentUser.uid === tale.authorId` (or `tale.authorUID`). Readers must never see edit controls.

### 2. Fragment Reading Progress, Manual Toggles, Sorting & Downloads

- **Fragment Trail Sorting**:
  - The Chronicle fragments toolbar includes `#btn-sort-chronicles` allowing readers to toggle display order between **Oldest First** (`asc`, Scroll #1 -> #N) and **Newest First** (`desc`, Scroll #N -> #1).
  - Label `#sort-chronicles-label` reflects active order ("Oldest First" vs "Newest First").
  - Preserves true 0-based chapter indices (`originalIndex`) on `data-chapter-index="${idx}"`, scroll numbering (`Scroll #${idx + 1}`), progress queries, and download triggers regardless of sort direction.
  - Active sort order is preserved across individual and batch read/unread updates.
- **Manual Fragment Read/Unread Toggles**:
  - Each fragment item in `#chapter-list` provides discrete read/unread triggers (`data-action="mark-read"`, `data-action="mark-unread"`).
  - Updates local progress cache (`markChapterRead`, `markChapterUnread`) and syncs to cloud progress service when authenticated (`syncMarkChapterRead`, `syncMarkChapterUnread`).
- **Fragment & Chronicle Downloads & Format Selection**:
  - Single Fragment Download: Triggered by `data-action="download-chapter"` via `downloadChapter(taleId, chapterIndex, options)`. Exports the individual fragment in Markdown (`.md`) or EPUB (`.epub`).
  - Full Chronicle Download: Triggered by `#btn-download-all-chronicles` via `downloadChronicle(taleId, options)`. Exports the complete compiled chronicle in Markdown (`.md`) or EPUB (`.epub`).
  - **Archive Format Selection Popup**:
    - Both single-fragment and full-chronicle download confirmations present an accessible format choice radiogroup offering:
      - **Markdown Archive (`.md`)**: Plaintext format for note-taking and personal vaults.
      - **EPUB Electronic Book (`.epub`)**: Valid EPUB 3 package generated via native zero-dependency ZIP archiver (`buildEpubBlob`, `createZipArchive`), complete with title page, navigation TOC, clean typography stylesheet, and semantic chapter XHTML.
    - Active format defaults to `.md` and dynamically toggles indicators and confirmation button actions.
    - Selected format is passed directly to `downloadChronicle(taleId, { format })` and `downloadChapter(taleId, chapterIndex, { format, ... })`.
- **Chronicle Batch Actions**:
  - Chronicle TOC header provides batch actions:
    - `#btn-sort-chronicles`: Toggles chronological sort order between ascending and descending.
    - `#btn-mark-all-read`: Marks all fragments as read in local storage and cloud progress.
    - `#btn-mark-all-unread`: Resets all fragment read states to unread.
    - `#btn-download-all-chronicles`: Initiates comprehensive offline download with format selection.

### 3. Comment & Reply Tree Architecture (Unified Design System)

- **Design Parity between Reader and Tale Pages**:
  - The comments ("echoes") section on the tale page matches the design system established on the reader page discussion panel.
- **Circular Typography Initials Avatar**:
  - Instead of external Dicebear avatar images, avatars use circular typography chips rendering the user's uppercase initials (extracted via `getAuthorInitials(authorName)`).
  - Background uses `var(--accent)`, font uses `var(--font-serif)`, with `border-radius: 50%` and high-contrast letterforms.
- **Date-Time Formatting Standard**:
  - All timestamps use `formatCommentDateTime(at)` (shared in `src/utils/comment.utils.ts`; unwraps Firestore `{ seconds }` timestamps) rendering both formatted date and time (`MMM D, YYYY at h:mm A`, e.g., "Oct 12, 2026 at 11:05 PM").
- **Rectangular Technical Badges (Anti-Vibecoding)**:
  - **Author Tag** (`.author-tag`): Structural rectangular shield with `var(--accent)` background and border, indicating the tale author. Never use rounded pill badges.
  - **Edited Badge** (`.edited-badge`): Clean rectangular badge with `var(--border)` and `var(--text-muted)` indicating modified reflections.
  - **Mention Badge** (`.reply-target-tag` / `.reply-to-tag`): Displays `@AuthorName` in nested replies for clear conversational continuity.
- **Nested Replies Indentation & Boundary Alignment**:
  - **Left-Only Indentation**: Replies indent only on the left side with a subtle guide line (`border-left: 1px solid rgb(var(--light-rgb) / var(--a-04))`).
  - **Flush Right Boundary**: On the right side, nested replies must not inset further. CSS applies negative right margin (`margin-right: -0.75rem` desktop, `-0.5rem` mobile) on nested `.child-replies` / `.comment-replies-list` so reply boxes stretch flush with the parent container rather than pinching inwards.
- **Data Storage**:
  - All comments and replies live under `v1/taletranscend/projects/v1/tales/${taleId}/comments`.
  - Root comments: `parentId: null` or omitted.
  - Replies: `parentId: rootCommentId`, `replyToId: immediateCommentOrReplyId`, `replyToAuthorName: string`.
  - Security Rules requirement: All replies under a comment must adhere to Firestore rules validating that `parentId` matches the parent chain.
- **Tree Construction**:
  - Group flat or hierarchical reply records using `buildReplyTree(comments)` (shared in `src/utils/comment.utils.ts`; import the module directly, not via the `@/utils` barrel).
  - Recursively render reply nodes with nested child lists (`_renderReplyNode`).
- **Inline Editing & Forms**:
  - Comments and replies can be edited by their original author via `.comment-inline-form` with `.comment-textarea`, `.comment-cancel-btn`, and save action.
  - Updates Firestore document: `text: updatedText`, `isEdited: true`, `editedAt: serverTimestamp()`.
- **Soft Deletion Protocol**:
  - Comments are never hard-deleted if descendant replies may exist.
  - Firestore payload: `text: ''`, `isDeleted: true`, `deletedAt: serverTimestamp()`.
  - UI representation: Displays "This has been deleted by the user." in muted, italic typography.
  - Action triggers (reply, edit, delete) are hidden on soft-deleted items, while preserving the child reply tree.
- **Guest Read-Only Gate**:
  - Anonymous Firebase sessions are guests. Posting, replying, liking, editing, and deleting comments/replies must call `requireRegisteredUser()` from `src/services/auth.guard.js` before any write.
  - The gate shows a warning toast with a **Sign in or sign up** action whose `returnUrl` is the current page; Firestore rules enforce the same boundary with `isRegistered()`.
- **Rate Limiting & Cooldown**:
  - Posting reflections and echo-backs is protected by cooldown (`checkRateLimit`, `applyButtonCooldown`) preventing spam transmissions.

### 4. Chronicle Missives & Author Sanctuary Architecture

- **Section Naming & Lore Alignment**:
  - The section and tab are named **Missives** (`data-tab="letter"`), reflecting the archival high-fantasy lore alongside _Synopsis_, _Chronicles_, and _Echoes_.
  - Dual-mode architecture depending on whether the viewing user is the tale author or a reader:
- **Author Mailroom View (`#author-missives-view`)**:
  - Activated when `auth.currentUser.uid === tale.authorId`.
  - Inbound Missives Desk: Renders all missives received from readers for this chronicle.
  - Stats Bar: Live tally of Total, Pending, and Replied missives.
  - Filter Bar: Filter chips for `All`, `Unanswered`, `Replied`, `Reported`, and `Blocked`.
  - Author Operations:
    - **Reply** (`replyToMissive`): Inline response composer allowing the author to transmit an archival response back to the reader, setting `status: 'replied'`.
    - **Report** (`reportMissive`): Flags inappropriate or abusive missives to archivists.
    - **Block** (`blockSender`): Blocks hostile senders from submitting further missives for this chronicle.
- **Reader Missives View (`#reader-missives-view`)**:
  - Activated when the viewing user is a registered reader. Guests can read the author card but the missive submit handler calls `requireRegisteredUser('send a missive')` and stops before dispatch.
  - Inscribe Missive: Reader form with category selection (Lore & World, Character Doubts, Plot & Theories, Connect & Praise), reader moniker, optional contact handle, and message textarea.
  - Dispatched Inquiries & Scribe Responses (`#reader-sent-inquiries-container`):
    - Lists all inquiries dispatched by the user for this tale.
    - Status indicators: `Awaiting Scribe Response` vs `Response Received`.
    - When the author replies, the scribe's response card is displayed directly beneath the inquiry with author avatar, timestamp, and response text.
  - Scribe Invitation Teaser: Compact teaser card (`.chronicler-invite-card`) in the synopsis panel inviting readers to dispatch missives; hidden for authors.
- **Direct Mail Action**:
  - If author has registered email, direct mail button (`#letter-author-email-btn`) links to `mailto:${authorEmail}`.
- **Reference**:
  - See `directives/author_registration_and_correspondence.md` for full registration wall and correspondence procedures.

### 6. Custom Tale 404 Error Screen (Record Unresolved)

- **Trigger Conditions**:
  - Activated when an invalid or nonexistent chronicle ID is passed in the URL (e.g. `?id=GIup` or `/tales/GIup`) and Firestore returns `null` or throws upon hydration.
- **Architectural Distinction vs Global 404**:
  - **Global 404 (`src/views/404.html`)**: Generic page-level fallback with giant `404` typography, "Lost in the Archives" headline, and "Return Home" CTA.
  - **Tale 404 (`#tale-not-found-view` in `tale.html`)**: Preserves the archive layout and navigation bar, displaying:
    - Calm frosted emblem (`book-x`) in subtle neutral tones (`bg-white/4`, `text-slate-300`).
    - Quiet technical badge: `Archive 404 // Record Unresolved` (`text-slate-400 font-mono text-[10px]`).
    - Subtle searched ID chip: `#not-found-tale-id` in monospace text without harsh contrast.
    - Concise archival copy: "The tale you are searching for is not recorded or might have been deleted under the Chronicle Preservation Policy."
    - Restrained layout: Centered `max-w-2xl` card with zero aggressive blur rings or neon glows, ensuring comfortable reading in dark mode.
    - Primary CTA: "Navigate to Library" linking directly to `/library.html`.
    - Secondary CTA: "Report Missing" button with quiet ghost styling.
- **Report Missing Flow (`setupReportMissingTale`)**:
  - Clicking "Report Missing" opens an accessible glassmorphic confirmation modal (`showConfirmModal`) confirming the report dispatch for the specific chronicle ID.
  - Upon user confirmation, dispatches the archival report, fires a feedback toast ("Missing chronicle report dispatched to the archivists."), and transitions the button into a disabled state displaying "Report Dispatched".
- **Anti-FOUC & Skeleton Clearance (`renderTaleNotFound`)**:
  - Hides `#hero-section` and `#tale-content-container`.
  - Purges all `.skeleton` pulse classes so no loading skeletons linger.
  - Calls `readyReveal()` immediately so `#app-boot-curtain` dissolves without waiting for the 3.5s fallback timer.

### 5. Anti-Vibecoding, Motion & Aesthetics Compliance

- **Zero Emojis**: Never use emojis in button labels, badges, comment placeholders, or toasts.
- **Zero Pill Badges**: Use structural rectangular shields (`rounded-sm` or sharp geometry) rather than pills (`rounded-full`).
- **Zero Glowing/Pulsing Dots**: Status and role indicators must use clean static rectangular micro-badges (`w-1.5 h-1.5 rounded-xs`) without `animate-pulse` or `rounded-full`.
- **Typographic Initials Avatars**: Use local SVG data URIs (`generateInitialsAvatarDataUrl`) with high-contrast serif typography (`Cinzel, serif`) and `rounded-2xl` matching card geometries. Never rely on external cartoon Dicebear avatars.
- **Motion & CLS Elimination**:
  - Zero translation jumps on hydration: Title and hero metadata crossfade smoothly via opacity (`transition-opacity duration-300`). Never animate 48px/32px vertical shifts (`translate-y-12`, `translate-y-8`) when swapping loading skeletons with actual chronicle data.
  - Chapter hover smoothness: `.chapter-item:hover` styles background and border with soft drop shadow, omitting `translateY(-2px)` to prevent flutter in long scrollable lists.
  - Throttled Scroll Tracking: `initHeaderScroll` wraps scroll updates in `requestAnimationFrame` with boolean lock to prevent layout thrashing and synchronous reflows.
- **Mobile Responsive Layout & Safe Areas**:
  - Cover art & Author Sanctuary layout: On mobile screens (`< lg`), the sticky hanging `<aside>` containing the Cover Art and Author Sanctuary/Inquire card comes directly above the content tabs (Synopsis, Chronicles, Echoes, Missives), presenting the chronicle identity prominently before readers explore the tabs.
  - Mobile button labels: Hero action grid maintains concise labels (`Initiate`, `Resume`, `Shelf`) to avoid multiline wrapping or overflow. Desktop retains expanded labels (`Initiate Reading`, `Resume Reading`, `Save to Shelf`).
  - Safe-Area Insets: The mobile floating action bar incorporates `calc(var(--space-4) + env(safe-area-inset-bottom, 0px))` to clear modern gesture navigation bars and home indicators.
- **Dedicated Archival Reading Header**:
  - The Tale Archive page (`tale.html`) purposefully does not mount the shared Global Header (`#app-nav`) or Command Palette (`initNav()`). Instead, it features its own clean, dedicated breadcrumb top bar (`#btn-back-nav` returning to Library) and reader-first layout, eliminating visual header clutter and maximizing reading space.
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
