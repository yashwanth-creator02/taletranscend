# Directive: Firestore Management and Security Rules

## Goal

Manage Cloud Firestore database indexes, security rules validation, and environment configuration for TaleTranscend while enforcing the Chronicle Preservation Policy.

## When this fires

- Changes to database schema, composite indexes (`firestore.indexes.json`), or security rules (`firestore.rules`).
- Deploying or verifying backend infrastructure.
- Inquiring about Firestore paths or collection scopes.

## Inputs

- `.env` configuration file populated with Firebase credentials (copied from `.env.example`).
- Firebase CLI (`npx -y firebase-tools@latest` or global `firebase`).
- Rules file: `firestore.rules` (repository root is the single source of truth).
- Index definition file: `firestore.indexes.json` (repository root).
- Rules emulator suite: `firestore/tests/rules.emulator.test.ts` (reads the root
  `firestore.rules`).

## Git Safety (If Modifying Code)

- Always isolate modifications on a working branch.
- Never commit security credentials (`.env`, `service-account.json`) to git.

## Tools / Scripts to Use

- Deploy indexes:
  ```powershell
  firebase deploy --only firestore:indexes
  ```
- Deploy rules:
  ```powershell
  firebase deploy --only firestore:rules
  ```
- Run the rules emulator suite (requires Java; port 8080 must be free):
  ```powershell
  npm run test:rules
  ```
- Seed sample tales into Firestore (requires a configured `.env`; safe to re-run, the seeder is
  idempotent):
  ```powershell
  npm run seed:tales
  ```
- Skills:
  - `firebase-firestore` for querying and collection setup.
  - `firebase-security-rules-auditor` for evaluating security rules posture.

## Application Database Path

All application data resides strictly under:

```
v1/taletranscend/projects/v1/
```

### Key Subcollection Scopes & Security Rule Constraints

1. **Top-Level Comments**:
   - Path: `v1/taletranscend/projects/v1/public/data/tales/${taleId}/comments/${commentId}`
   - Author ownership enforced via `authorId == request.auth.uid`.
   - Ordering: By `createdAt` descending for chronological echo streaming.

2. **Replies & Nested Echo Hierarchy**:
   - Path: `v1/taletranscend/projects/v1/public/data/tales/${taleId}/comments/${commentId}/replies/${replyId}`
   - Security rule constraint: `firestore.rules` enforces that `request.resource.data.parentId == commentId`.
   - All replies under a comment must keep `parentId: commentId` to satisfy this check, even when replying to another reply.
   - Reply-to-reply targets are tracked via `replyToId: replyId` and `replyToAuthorName: string`.
   - Nesting depth is constrained to `depth <= 3` — in `firestore.rules`, in `CommentSchema`
     (`src/utils/validation.utils.ts`), and in the UI clamp in `src/pages/tale/comments.js`.
     All three must move together; a UI that allows depth 4 or 5 while the rules cap 3 produces
     a silent `permission-denied` on submit.

3. **Soft Deletion & Preservation Policy**:
   - Comments and replies are never permanently deleted using `deleteDoc`.
   - Soft-delete mutation: Sets `text: ''`, `isDeleted: true`, and `deletedAt: serverTimestamp()`.
   - This preserves the comment thread tree and prevents orphaned child replies.

4. **Edit Metadata Tracking**:
   - Inline edits set `text: newText`, `isEdited: true`, `editedAt: serverTimestamp()`, and `updatedAt: serverTimestamp()`.

5. **Soul Resonance (Interactions)**:
   - Tracks resonance per user UID under tale interactions and reflects aggregated resonance counts on the tale document.

6. **Inquiries & Missives (The Chronicler's Letter)**:
   - Path: `v1/taletranscend/projects/v1/inquiries/${inquiryId}` — **top-level**, NOT a tale
     subcollection. (An earlier revision of this directive described
     `tales/${taleId}/inquiries/${inquiryId}` with `readerId`/`status: 'unread'`; that shape
     never matched the code, rules, or emulator tests and was corrected in the 2026-10-19 audit.)
   - Records reader inquiries sent to authors.
   - Contains: `taleId`, `authorId`, `senderId`, `senderMoniker`, `senderContact`, `category`,
     `message`, `status: 'sent'`, and `createdAt`.
   - Status transitions: `sent` -> `replied` (adds `replyText`, `replyAuthorName`, `repliedAt`),
     `reported` (adds `isReported`), `blocked` (adds `isBlocked`).
   - Update permissions: the addressed author can update inquiries addressed to them; admins can
     update any; the sending reader cannot update their own. Covered by emulator tests in
     `firestore/tests/rules.emulator.test.ts`.
   - Requires two composite indexes (the list below) — both queries are double-equality
     (`authorId`+`taleId` and `senderId`+`taleId`), which Firestore will not serve from
     single-field indexes.

7. **Drafts & Draft Chapters (authoring write contract)**:
   - Paths: `v1/taletranscend/projects/v1/users/${userId}/drafts/${draftId}` and
     `.../drafts/${draftId}/chapters/${index}`.
   - `firestore.rules` requires `authorId == userId` and `status` on draft CREATE, and `status`
     plus an unchanged `authorId` on draft UPDATE, so a draft can never be reassigned to another
     author. Legacy drafts created before `authorId` became part of the write contract stay
     updatable: authorship is only checked when the field exists. A draft payload without both
     is rejected — this is exactly how draft creation was silently broken in production before
     the 2026-10-19 audit. `authorId` and `status` are part of the write contract, not optional
     metadata; they are carried in `DraftMetadataSchema` so Zod cannot strip them.
   - Draft chapter documents require an integer `index` on BOTH create and update, plus
     `createdAt` on create. `index` must equal the numeric document ID.
   - Both draft writes are covered by regression tests in `firestore/tests/rules.emulator.test.ts`
     (the "draft WITHOUT index/authorId is denied" cases). Any change to the editor's save
     payload must keep those tests passing.

8. **Notifications & Admin Authority**:
   - Notification documents are created by an admin for a **different** user, so the create rule
     is `isAdmin()` — an owner-scoped create rule would deny the real flow.
   - `isAdmin()` reads custom claims ONLY (`request.auth.token.admin` / `.moderator`). The client
     gate `isCurrentUserAdmin()` in `src/services/admin.service.js` is deliberately claims-only
     for the same reason: `users/{uid}.role` is client-writable, so trusting it would let a user
     into the admin UI while every Firestore write is still rejected. Grant claims via the
     `setModeratorClaim` callable, never by editing `role`.
   - An owner may update only `isRead`, `readAt`, and `isPinned` on their own notifications.
     `isRead` and `isPinned` must be booleans and `readAt` must be a timestamp, so the read/pin
     path cannot be used to store arbitrary values.

9. **User Profile & Scribe Registry**:
   - Path: `v1/taletranscend/projects/v1/users/${userId}`
   - Author fields: `isAuthor: boolean`, `penName: string`, `authorEmail: string`, `authorBio: string`, `authorRegisteredAt: timestamp`.
   - Author ownership: Read permitted publicly; write strictly restricted to `request.auth.uid == userId`.

10. **Published Tales & Chapters (the publish contract)**:
    - Paths: `public/data/tales/${taleId}` and `.../tales/${taleId}/chapters/${index}`.
    - `src/pages/contribution/publish.js` writes the tale document ONCE, already
      `status: 'published'`. Do not reintroduce a follow-up `updateDoc` to flip the status:
      `allow update` on tales requires `respectsCooldown()` (5 s since `updatedAt`), which can
      never hold for a document created microseconds earlier. The flip was always denied, and
      because `safeAsync()` swallowed the denial the author still saw "published".
    - `status` must be one of `draft|submitted|published|rejected`. `'pending'` — the value the
      publish path used to send — is not accepted, and `getTales.js` only ever queries
      `status == 'published'` ordered by `publishedAt`, so a tale left at `'submitted'` with
      `publishedAt: null` is invisible to both the library and the reader.
    - `visibility` must be `public|private|unlisted`. The editor's visibility control offers
      `Unlisted` (`contribution.html` `data-visibility`), so that value must be accepted; only
      `'public'` is treated as public by the read rule, so every other value resolves to
      author/admin-only. Note this means `unlisted` currently behaves as _private_, not as
      "link-visible" — there is no link-sharing path in the app.
    - Each chapter write must carry `index` (integer), `estimatedReadMins` (integer),
      `wordCount` (integer), `title`, and `content` on BOTH create and update, plus `createdAt`
      on create. `index` must equal the chapter's position, which is also its document ID.
    - The tale create payload must stay at or under 40 fields
      (`request.resource.data.size() <= 40`).
    - The publish payloads are asserted against this contract in
      `firestore/tests/rules.emulator.test.ts` ("publish payload contract"); changing either
      side without the other fails that suite.

### Composite Indexes

All six legacy indexes plus three added in the 2026-10-19 audit. The three additions exist
because these queries are double-equality or equality+orderBy, which Firestore refuses to serve
from single-field indexes (`FAILED_PRECONDITION` at runtime, not at deploy time):

| Collection         | Fields                             | Serves                                              |
| ------------------ | ---------------------------------- | --------------------------------------------------- |
| `tales`            | `status` ASC, `publishedAt` DESC   | Home/library feeds and the moderation pipeline      |
| `tales`            | `authorId` ASC, `publishedAt` DESC | Author -> tales listing                             |
| `comments`         | `taleId` ASC, `createdAt` DESC     | Echo stream ordering                                |
| `drafts`           | `authorId` ASC, `updatedAt` DESC   | Draft shelf ordering                                |
| `drafts`           | `userId` ASC, `updatedAt` DESC     | Draft shelf ordering (owner-scoped)                 |
| `bookmarks`        | `userId` ASC, `createdAt` DESC     | Bookmark shelf ordering                             |
| `inquiries`        | `authorId` ASC, `taleId` ASC       | `fetchAuthorInquiries` / `subscribeAuthorInquiries` |
| `inquiries`        | `senderId` ASC, `taleId` ASC       | `fetchReaderInquiries` / `subscribeReaderInquiries` |
| `deletionRequests` | `status` ASC, `createdAt` DESC     | Admin deletion-request queue                        |

Deploy index changes with `firebase deploy --only firestore:indexes`. A missing index is
invisible until the query runs, so any new `where` + `where` or `where` + `orderBy` combination
must add an entry here in the same change.

## Outputs

- Deployed composite indexes on Cloud Firestore.
- Validated and deployed security rules.
- Verification logs.

## Edge Cases & Error Handling

- Chronicle Preservation Policy: Rules strictly enforce author ownership and admin-only chronicle dissolution. Never relax permissions to allow non-owners or unauthenticated users to overwrite or delete tales.
- Anonymous Auth: Every user receives a persistent anonymous UID from Firebase Auth. All ownership queries must reference `request.auth.uid`.
- Nested Reply Rules Match: Always ensure `parentId` matches the top-level comment ID in payload when posting nested replies, otherwise Firestore rules reject with permission-denied.
- Test vs Production Rules: Never deploy test-mode open rules to production. Run the test emulator suite prior to rules deployment.
- Single rules source: keep `firestore.rules` / `firestore.indexes.json` at the repository root. Do not create copies under `firestore/` — a drifted duplicate was deleted in the 2026-10-18 audit (F1/F2), and the emulator suite reads the root file.
- Orphaned emulator processes: if `npm run test:rules` reports port 8080 taken, a previous emulator JVM is still alive — find and stop the `java.exe` process holding the port before re-running.
- Docs deploy, code does not: `deploy.yml` ships `hosting,firestore:rules,firestore:indexes` on every
  push, but the client bundle only ships when the frontend build runs. A rule that requires a
  field the client never sends therefore breaks the feature in production the moment rules land.
  Before adding a field to a create/update rule, confirm the writer actually sends it — and add
  an emulator test that asserts the real payload shape, not an idealized one.
- Validators do not restrict keys: `isValidString('a', ...) && isValidNumber('b', ...)` accepts
  any NUMBER of additional fields. To bound document growth, pair per-field validators with a
  key allowlist, as `readerProgress` and its `chapters` subcollection do.
- Whole-document allowlists must be split across create and update:
  `request.resource.data.keys().hasOnly([...])` is evaluated against the MERGED document on
  update, so any field written by an earlier app version permanently blocks every future update
  to that document — silently, whenever the writer swallows errors. Use `keys().hasOnly(...)`
  plus a `size()` cap on CREATE, and
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` on UPDATE, which
  constrains only the keys that write touches. Growth stays bounded either way, because only the
  allowlisted keys can ever be added.
- `.keys()` is expensive, `field in request.resource.data` is not: use the `in` form for
  single-field presence checks (see the note above `isValidString`).
- A write that is denied but wrapped in `safeAsync()` produces a false success: the caller keeps
  going and the UI reports success. `publish.js` hit this in three separate places (status flip,
  chapter `index`, chapter `createdAt`). When a rule constraint is added or tightened, check
  every writer wrapped in `safeAsync()` and add an emulator test that asserts the real payload —
  not an idealized one — or surface the failure to the user.
