# Admin Dashboard Operations

The dashboard is a separate Vite page (`/admin.html`, also reachable at `/admin`)
that reads and writes the same Firestore data as the reader application. It has
no server of its own: every mutation is authorised by `firestore.rules`, and the
UI additionally hides modules the signed-in account cannot use.

## Access model

Access is derived from the Firebase ID token's custom claims, never from a
Firestore field and never from a URL parameter.

| Claim                | Dashboard role | Modules                                                                           |
| -------------------- | -------------- | --------------------------------------------------------------------------------- |
| `admin: true`        | Administrator  | Overview, Users, Deletions, Reports, Applications, Audit, Settings, Author Studio |
| `moderator: true`    | Moderator      | Overview, Deletions, Reports, Applications, Author Studio                         |
| neither              | Reader         | Access denied                                                                     |
| approved author only | Author         | Author Studio only                                                                |

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

| Hash             | Module         |
| ---------------- | -------------- |
| `#/` or empty    | Dashboard home |
| `#/overview`     | Overview       |
| `#/users`        | Users          |
| `#/deletions`    | Deletions      |
| `#/reports`      | Reports        |
| `#/applications` | Applications   |
| `#/audit`        | Audit log      |
| `#/settings`     | Settings       |
| `#/author`       | Author Studio  |

Unauthorised hashes render the module-level denial/error state rather than
bypassing the sidebar. The page is marked `noindex, nofollow`.

## Data and actions

| Module        | Reads                                                                                                                   | Writes                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview      | `getCountFromServer` for published tales, users, pending reports, applications and deletions; five recent audit entries | None                                                                                                                                           |
| Users         | `users` collection (newest or name order), exact UID lookup, per-user tale count on demand                              | `isBanned`, `isVerifiedWriter`, `role`, `updatedAt`; audit entry                                                                               |
| Deletions     | `deletionRequests` filtered by status, joined to the tale and requester profile                                         | Decision status, reviewer, timestamp, notes; approval deletes the tale in the same batch and notifies the author; audit entry                  |
| Reports       | `reports` filtered by status                                                                                            | `status`, reviewer, timestamp; audit entry                                                                                                     |
| Applications  | `authorApplications` filtered by status                                                                                 | `status`, `reviewedBy`, `reviewedAt`, `notes`; approval also grants the applicant the profile `author` role; audit entry (administrators only) |
| Audit         | `adminAuditLogs`, newest first, paginated                                                                               | Append-only; never edited or deleted from the client                                                                                           |
| Settings      | `appConfig/site`, `featureFlags`                                                                                        | Merge writes to flag documents; configuration is read-only in the UI; audit entry                                                              |
| Author Studio | The signed-in author's tales and deletion requests                                                                      | New deletion request (reason 5–2000 characters); no staff audit writes                                                                         |

Counters that fail to load render an em dash rather than a fabricated number.
All destructive actions require an explicit confirmation; deletion approval
states that the public tale record will be removed.

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
Users, Audit or Settings, and that an administrator can complete each module's
primary workflow.

## Known limits

- A ban is a profile flag (`isBanned`) and does not revoke an existing Firebase
  session by itself. Enforcement points that interpret the flag remain the
  authority for reader features.
- The profile `role` field is display metadata. It does not grant staff access;
  only custom claims do. Application approval grants the author capability, but
  never changes an administrator or moderator profile role.
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
- Admin tables scroll horizontally inside their container on narrow screens. The
  page itself does not overflow; every column remains reachable.
- Audit search and author request-state checks operate on the pages already
  loaded; they are not unbounded collection scans.
- The dashboard intentionally has no bulk actions and no client-side user
  deletion.
- Feature flags are documented as open-ended documents. The four known IDs
  (`betaAccess`, `darkMode`, `newReaderFlow`, `enhancedSearch`) are exposed by
  the dashboard, but no reader bundle in this repository consumes them yet; a
  consumer must read `featureFlags` explicitly.
