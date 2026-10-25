# Admin Dashboard Operations

The dashboard is a separate Vite page (`/admin.html`, also reachable at `/admin`)
that reads and writes the same Firestore data as the reader application. It has
no server of its own: every mutation is authorised by `firestore.rules`, and the
UI additionally hides modules the signed-in account cannot use.

## Access model

Access is derived from the Firebase ID token's custom claims, never from a
Firestore field and never from a URL parameter.

| Claim                | Dashboard role | Modules                                                                                             |
| -------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `admin: true`        | Administrator  | Overview, Users, Tales & Chapters, Deletions, Reports, Comments, Applications, Audit, Author Studio |
| `moderator: true`    | Moderator      | Overview, Deletions, Reports, Comments, Applications                                                |
| neither              | Reader         | Access denied                                                                                       |
| approved author only | Author         | Author Studio only                                                                                  |

Tales & Chapters is administrator-only. Moderators may read a specific tale
while triaging a report, but they cannot open the global content browser or
edit and delete tales.

`admin` takes precedence when both claims are present. Every staff service
re-reads the force-refreshed token through `getStaffIdentity()` before writing,
so a stale client cannot attribute an action to another account. The Firestore
rules remain the authority: audit creation requires `actorId == request.auth.uid`
and a role that matches the actual claim, and application decisions require
`reviewedBy == request.auth.uid`.

### Bootstrapping the first administrator

The first administrator cannot be granted from inside the dashboard. Use the
Firebase Admin SDK once, with a service-account credential that is never
committed:

```js
import { getAuth } from 'firebase-admin/auth';
await getAuth().setCustomUserClaims(FIRST_ADMIN_UID, { admin: true });
```

After the claim is set, the account must sign out and back in (or force-refresh
its ID token) before the dashboard will accept it.

### Test staff account

The local test administrator used for verification is the Google account with
UID `TmBpEMmQwfOLejmbxAZdr3ZDbol2` and claim `{ "admin": true }`. Claims can be
inspected without printing any secret:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "<path-to-service-account.json>"
node set-claims.mjs show TmBpEMmQwfOLejmbxAZdr3ZDbol2
```

`set-claims.mjs` is a local, gitignored operator utility. Never commit it and
never commit the service-account JSON.

## Routes

The page uses hash routing; the first route is loaded after access resolves.
Do not add a document-wide `<base>` element to `admin.html`: it rewrites
`#/<module>` links against the site root and navigates clicks out of the
dashboard.

| Hash             | Module           |
| ---------------- | ---------------- |
| `#/` or empty    | Dashboard home   |
| `#/overview`     | Overview         |
| `#/users`        | Users            |
| `#/content`      | Tales & Chapters |
| `#/deletions`    | Deletions        |
| `#/reports`      | Reports          |
| `#/comments`     | Comments         |
| `#/applications` | Applications     |
| `#/audit`        | Audit log        |
| `#/author`       | Author Studio    |

Unknown or unauthorised hashes render a generic denial state with a link back
to the dashboard home. They never fall back silently to the home screen, so a
mistyped or forbidden route is visible to the operator. The page is marked
`noindex, nofollow`.

## Data and actions

| Module           | Reads                                                                                                                                                                                                                                                                                          | Writes                                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview         | `getCountFromServer` for published tales, reader profiles, pending reports, applications and deletions; five recent audit entries                                                                                                                                                              | None                                                                                                                                                                                                                                                                      |
| Users            | `users` collection (newest or name order), exact UID lookup, per-user tale count on demand                                                                                                                                                                                                     | `isVerifiedWriter`, `updatedAt`; audit entry                                                                                                                                                                                                                              |
| Tales & Chapters | Every tale, including drafts and soft-deleted records, filtered by status and searched by title or exact ID; cursor-paginated. Detail adds up to 50 chapters, a live comment count, and deletion metadata                                                                                      | `title`, `status`, `visibility`, the four required counters when missing, `publishedAt` on first publication, `updatedAt`; soft removal with reason/category; restore; separately confirmed permanent removal; audit entry. Chapter text stays author-owned and read-only |
| Deletions        | Two tabs. Requests: `deletionRequests` filtered by status and searched by tale-id prefix, joined to the tale and requester profile. Removed content: `softDeletions` registry filtered by entity type/status and searched by title prefix, with live entity, archive text, and related reports | Petition decisions; approval soft-removes the tale and registers it for restore. Registry restore and separately confirmed permanent removal. Administrator-only bulk soft removal of up to 50 tales, all-or-nothing and audited                                          |
| Reports          | `reports` filtered by Submitted/Under review/Responded/Resolved/Closed, searched by target-id prefix; detail includes subject, category, description, target summary, private staff note, and response history                                                                                 | Mark under review, send user-visible response (optionally mark resolved), resolve/close with notes, write private notes, and send direct inbox messages; every write audited                                                                                              |
| Comments         | Collection-group read across every tale's `comments`, filtered by visible/hidden/pinned/removed and paginated; detail adds the parent tale summary, staff-only archived text, and deletion metadata                                                                                            | `isHidden`, `isPinned`, `reportCount`, `updatedAt`; soft removal with reason/category; restore; separately confirmed permanent removal; audit entry. Public comment surfaces honour all flags                                                                             |
| Applications     | `authorApplications` filtered by status and searched by case-sensitive pen-name prefix                                                                                                                                                                                                         | `status`, `reviewedBy`, `reviewedAt`, `notes`; approval also grants the applicant the profile `author` role; audit entry (administrators only)                                                                                                                            |
| Audit            | `adminAuditLogs`, newest first, paginated                                                                                                                                                                                                                                                      | Append-only; never edited or deleted from the client                                                                                                                                                                                                                      |
| Author Studio    | The signed-in author's tales and deletion requests                                                                                                                                                                                                                                             | New deletion request (reason 5–2000 characters); no staff audit writes                                                                                                                                                                                                    |

Counters that fail to load render an em dash rather than a fabricated number.
All destructive actions require an explicit confirmation. Removal keeps the
record and moves it out of public view; permanent deletion is a separate action
available only after review in the Removed content tab, and bulk removal states
the selected count and types before confirmation.

### Global comment rule and indexes

The Comments module uses a Firestore collection-group query. That requires a
database-root rule, not a rule nested under the tale path:

```rules
match /{path=**}/comments/{commentId} {
  allow read: if isAdmin();
}
```

`isAdmin()` accepts administrators and moderators. The existing nested comment
rule still authorises the flag update and delete for a known tale. Deploy the
rule and the composite indexes in `firestore.indexes.json` before using the
module against the live project:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

The public tale and reader comment queries also filter `isHidden == false` and
order pinned comments first, so they depend on the comment `taleId + isHidden +
isPinned + createdAt` index. Legacy comments written before those fields existed
would be invisible to an equality query; the live project had 51 such comments,
which were backfilled to `isHidden: false` and `isPinned: false` without changing
any other field.

## Moderation, reporting, and inbox operations

### Soft deletion and restoration

Removing a tale, comment, or reply never drops the document. The record receives
`isDeleted`, `deletedAt`, `deletedBy`, `deletionType`, `deletionReason`,
`moderationCategory`, and `updatedAt`. Tales additionally store
`previousStatus`/`previousVisibility` and move to `status: 'deleted'` /
`visibility: 'private'`. Comments and replies have their public text cleared;
the original text is preserved in staff-only `moderationArchive` so restore can
return it intact. Comment archives also retain `previousIsHidden`, so restoring a
removed comment does not reveal a comment that was hidden before removal.

The `softDeletions` registry provides cursor-friendly filters without scanning
each entity collection. Registry IDs are deterministic:

- `tale_<taleId>`
- `comment_<taleId>_<commentId>`
- `reply_<taleId>_<commentId>_<replyId>`
- `chapter_<taleId>_<chapterIndex>` (registry support only; chapter removal is
  not exposed as a separate operation in this delivery)

Restore returns the tale to its previous status and visibility and notifies the
owner. Comment/reply restore returns archived text. Permanent removal is
administrator-only for tales and staff-authorized for comments/replies, requires
a second confirmation, and is audited. The entity deletion and the registry
`purged` update commit in one batch, so the registry cannot be left claiming a
missing record is still restorable. Author-deleted comments and replies remain
distinguishable from administrator moderation and are not restored by staff
through the moderation flow.

### Bulk tale removal

The Removed content tab exposes an administrator-only bulk flow. It loads tale
pages, excludes already-removed records, shows the selected count and titles
before confirmation, and sends the selected IDs to
`bulkSoftDeleteTales`. The service validates every record first, rejects more
than 50 IDs, applies all updates and registry writes in one batch, and records
one audit entry. A partial result is never reported as success. The rules
emulator exercises the full 50-tale batch, so the limit is verified against the
deployed rule expression budget rather than assumed.

### Reports and responses

Registered readers can report a tale, comment, reply, broken page, or the
website. The report dialog prefills context but lets the reporter edit subject,
category, and description. `createReport` writes the staff record and the
reporter-safe `reportHistory` mirror atomically. Reporters read only their own
history; private notes live in `reportPrivateNotes` and are staff-only.

Report states are `pending`, `under_review`, `responded`, `resolved`, and
`dismissed`; readers see Submitted, Under Review, Responded, Resolved, and
Closed. Staff can mark under review, send a response, resolve, or close. A
response appends to the report and history, optionally writes a private note,
sends a `report_response` notification to the reporter's existing inbox, and is
audited. Resolved and closed reports cannot receive a further response. The
detail target summary resolves tale, comment, reply, and user targets. Staff can
also send a direct `admin_message` notification from the Reports workspace after
the recipient is validated.

The Settings Support & Reports section links the developer address
`leo.two.dev@gmail.com`, opens the website report form, and lists the signed-in
reader's own report history with the latest user-visible response.

## Verification

```powershell
npm run format:check
npm run lint
npm run lint:tokens
npm run type-check
npm test
npm run test:rules
npm run build
npx playwright test e2e/specs/admin-access.spec.js --workers=1
```

For a live visual check, start the worktree dev server with `npm run dev` and
open `/admin.html`. Test at 320, 390, 768, 1280 and 1440 pixels wide. Confirm
that a reader account sees the denial screen, that a moderator cannot open
Users or Audit, and that an administrator can complete each module's
primary workflow.

## Known limits

- The dashboard neither displays nor edits the `isBanned` flag. The flag is
  stored on some profiles, but no reader surface in this repository enforces it,
  and the client cannot revoke a Firebase session. A real ban requires
  server-side enforcement or a custom-claim check, so showing it as an account
  status would promise an effect the application does not deliver.
- The profile `role` field is display metadata. It does not grant staff access;
  only custom claims do. The dashboard no longer offers a role selector for the
  same reason: writing `role` cannot grant a claim. Application approval grants
  the author capability, but never changes an administrator or moderator
  profile role.
- Approving a deletion petition no longer erases the tale document. It soft-removes
  the tale, records it in the Removed content registry, and notifies the author.
  Only an administrator can approve; moderators can reject a pending petition,
  but the approval control is hidden and the service rejects approval before any
  write. Chapter and comment subcollections remain intact for restoration.
  Permanent removal is a separate administrator action and still does not cascade
  subcollections, which requires a trusted server-side cleanup job.
- A deletion petition must target an existing tale owned by the petitioner.
  The profile form accepts a title or ID and resolves it to one of the caller's
  own tales before writing the request; approval re-checks the owner.
- Profile owners cannot set or clear their own `isBanned` or
  `isVerifiedWriter` flags, and cannot promote their display role to
  administrator or moderator. Those changes are staff-only.
- Author Studio lists tales that have a `publishedAt` value. Drafts are managed
  in the writer workspace, not the control room.
- The Users table lists `users/{uid}` profile documents only. A Firebase Auth
  account without a profile document, including an anonymous visitor session,
  does not appear. The browser SDK cannot enumerate Auth accounts at all; that
  requires secure server-side Admin SDK access, which this Spark-plan project
  does not expose. The dashboard states this in the Users module instead of
  inventing rows.
- Admin lists are cursor-paginated at 20 records per page. A count such as
  `20+ results` means more records exist; select Load More to continue. It is
  not a claim that the collection contains only 20 rows.
- Tale edits are restricted to title, status and visibility, with the required
  counters and timestamp. Firestore enforces a five-second cooldown between
  updates. Chapter text remains author-owned and is read-only here; staff can
  soft-remove a tale but cannot rewrite its chapters.
- Comment moderation can hide, unhide, pin, unpin, soft-remove, restore, or
  permanently remove. Hidden and removed comments are absent from the tale and
  reader comment surfaces, and pinned comments sort first. Removing a comment
  does not cascade to its replies; replies are a separate subcollection and have
  their own registry records. Staff-only archived text is shown in the detail
  panel for removed comments.
- The Comments module has status filters and cursor pagination but no full-text
  search; an unbounded text scan would defeat the Spark-plan page limits.
- Admin tables scroll horizontally inside their container on narrow screens. The
  page itself does not overflow; every column remains reachable.
- Deletion, report, and application search use server-side prefix range
  queries over `taleId`, `targetId`, and `penName`. They require the matching
  `status + field` composite indexes in `firestore.indexes.json`; they are not
  unbounded collection scans. Audit search and author request-state checks
  operate on the pages already loaded.
- The only bulk action is administrator-only soft removal of up to 50 tales,
  validated all-or-nothing in one batch. There is no client-side user deletion.
  Permanent removal remains a separate per-record action.
- The Site Settings module was removed. It edited `appConfig/site` and four
  feature-flag documents (`betaAccess`, `darkMode`, `newReaderFlow`,
  `enhancedSearch`), but no reader bundle in this repository reads
  `featureFlags` or `appConfig`, so every toggle was inert. The `refs.appConfig`
  and `refs.featureFlags` helpers and their Firestore rules remain in place for
  an external consumer; the dashboard simply no longer presents controls that
  change nothing in this application.
- Writer verification is the only profile mutation in Users with a reader-side
  effect: `isVerifiedWriter` is read by `getAuthorStatus()` and unlocks Author
  Studio. The module states that staff claims, not the profile, remain the
  authority for dashboard access.
