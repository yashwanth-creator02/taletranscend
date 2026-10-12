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

## Standard Operating Procedures

### 1. Tale Hero Actions

- **Soul Resonance**:
  - Document path: `v1/taletranscend/projects/v1/reactions/${taleId}_${userId}`.
  - Optimistic UI update: Toggle resonance state and adjust resonance counter locally immediately upon click.
  - On failure: Revert UI state, rollback counter, and display user-facing error toast.
- **Shelf Management**:
  - Add or remove tale from user shelf/reading list with optimistic feedback.
- **Share Action**:
  - If `navigator.share` is supported by the browser, invoke native sharing with title and URL.
  - Otherwise, copy URL to clipboard and show confirmation toast.
- **Edit Chronicle / Tale Control**:
  - Only render the "Edit Tale" or "Edit Chronicle" button if `auth.currentUser.uid === tale.authorId` (or `tale.authorUID`).
  - Readers must never see edit controls.

### 2. Comment & Reply Tree Architecture

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
  - UI representation: Displays "This comment has been removed by the user" in muted, italic typography.
  - Action buttons (reply, edit) are hidden on soft-deleted comments, but the child reply tree remains intact.

### 3. Sidebar & Author Sanctuary

- **Layout Structure**:
  - Positioned beneath the Sticky Hanging Cover Art column (`sticky top-24`).
  - Combines author identity with connect/inquire functionality.
- **Navigation**:
  - Clicking the author avatar navigates to `/author/?id=${tale.authorId || tale.authorUID}`.
- **Self-Inquiry Guard**:
  - Hide the "Inquire" / "Letter" button if the viewer is the tale author.
- **Consolidation**:
  - Bookmark controls reside exclusively in the hero interaction bar, not in the sidebar sanctuary card.

### 4. Anti-Vibecoding & Aesthetics Compliance

- **Zero Emojis**: Never use emojis in button labels, badges, comment placeholders, or toasts.
- **Zero Pill Badges**: Use structural rectangular shields (`rounded-sm` or sharp geometry) rather than pills (`rounded-full`).
- **Zero Glowing/Pulsing Dots**: Status and role indicators must use clean typographic labels.
- **Design Tokens**: All background, text, border, and accent colors must reference CSS variables in `tokens.css`.

## Edge Cases & Error Handling

- **Anonymous Auth Delay**: Ensure `auth.currentUser` is resolved before executing reactions or comments.
- **Network Disconnections**: Rollback optimistic state gracefully if Firestore writes fail.
- **Deep Threading Mobile Overflow**: Limit horizontal indentation or collapse excessive reply depths to maintain readability on small screens.
