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
| `moderator: true`    | Moderator      | Overview, Deletions, Reports, Comments, Applications, Author Studio                                 |
| neither              | Reader         | Access denied                                                                                       |
| approved author only | Author         | Author Studio only                                                                                  |

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

Unauthorised hashes render the module-level denial/error state rather than
bypassing the sidebar. The page is marked `noindex, nofollow`.

## Data and actions

| Module           | Reads                                                                                                                                                        | Writes                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview         | `getCountFromServer` for published tales, reader profiles, pending reports, applications and deletions; five recent audit entries                            | None                                                                                                                                                                                               |
| Users            | `users` collection (newest or name order), exact UID lookup, per-user tale count on demand                                                                   | `isVerifiedWriter`, `updatedAt`; audit entry                                                                                                                                                       |
| Tales & Chapters | Every tale, including drafts, filtered by status and searched by title or exact ID; cursor-paginated. Detail adds up to 50 chapters and a live comment count | `title`, `status`, `visibility`, the four required counters when missing, `publishedAt` on first publication, `updatedAt`; delete tale; audit entry. Chapter text stays author-owned and read-only |
| Deletions        | `deletionRequests` filtered by status, joined to the tale and requester profile                                                                              | Decision status, reviewer, timestamp, notes; approval deletes the tale in the same batch and notifies the author; audit entry                                                                      |
| Reports          | `reports` filtered by status                                                                                                                                 | `status`, reviewer, timestamp; audit entry                                                                                                                                                         |
| Comments         | Collection-group read across every tale's `comments`, filtered by visible/hidden/pinned and paginated; detail adds the parent tale summary                   | `isHidden`, `isPinned`, `reportCount`, `updatedAt`; delete comment; audit entry. Public comment surfaces honour both flags                                                                         |
| Applications     | `authorApplications` filtered by status                                                                                                                      | `status`, `reviewedBy`, `reviewedAt`, `notes`; approval also grants the applicant the profile `author` role; audit entry (administrators only)                                                     |
| Audit            | `adminAuditLogs`, newest first, paginated                                                                                                                    | Append-only; never edited or deleted from the client                                                                                                                                               |
| Author Studio    | The signed-in author's tales and deletion requests                                                                                                           | New deletion request (reason 5–2000 characters); no staff audit writes                                                                                                                             |

Counters that fail to load render an em dash rather than a fabricated number.
All destructive actions require an explicit confirmation; deletion approval
states that the public tale record will be removed.

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
- Approving a deletion removes the tale document. Chapter and comment
  subcollections are not enumerable from the client after that point, so they
  are left for server-side cleanup rather than deleted here.
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
  delete a tale but not rewrite its chapters.
- Comment moderation can hide, unhide, pin, unpin or delete. Hidden comments are
  removed from the tale and reader comment surfaces, and pinned comments sort
  first. Deleting a comment does not cascade to its replies, because replies are
  a separate subcollection.
- The Comments module has status filters and cursor pagination but no full-text
  search; an unbounded text scan would defeat the Spark-plan page limits.
- Admin tables scroll horizontally inside their container on narrow screens. The
  page itself does not overflow; every column remains reachable.
- Audit search and author request-state checks operate on the pages already
  loaded; they are not unbounded collection scans.
- The dashboard intentionally has no bulk actions and no client-side user
  deletion.
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
