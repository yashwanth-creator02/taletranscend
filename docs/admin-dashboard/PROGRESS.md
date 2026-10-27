# Admin Dashboard Progress & Status (TaleTranscend)

> Persistent work log for the admin dashboard build. Updated before and after
> every task. Branch: `feature/admin-dashboard`. Never merged to main. Firestore
> rules and indexes were deployed to project `taletranscend` on 2026-10-23 after
> the emulator suite passed.

## 1. Goal and Confirmed Scope

**Goal:** a secure, role-gated admin dashboard for TaleTranscend, delivered on
branch `feature/admin-dashboard`, with Firestore rules as the authority (never
the UI alone), paginated free-tier-safe queries, emulator-based rules tests for
all five roles, and no credential committed to the repository.

**Gate 1 status: APPROVED with defaults** (user: "go with defaults and continue").

Confirmed defaults:

1. Roles come from Firebase Auth custom claims (`admin`, `moderator`), assigned
   by a local Admin SDK procedure. No service-account key is committed.
2. Permission matrix: guest and ordinary user cannot enter the dashboard; an
   author gets an own-content author section only; a moderator gets moderation
   queues; an administrator gets the full dashboard.
3. Modules: overview stats, reader profiles and writer verification, global
   tales and chapters, tale deletion moderation, comment/report queues, global
   comment moderation, author applications, audit log, plus an author's
   own-content section.
4. Route `admin.html` under `src/pages/admin/`; navigation entry visible only to
   privileged users; reuse `tokens.css`, `confirmModal.js`, and `toast.js`.
5. Audit log is required (`adminAuditLogs`); destructive actions require a
   confirmation dialog and status updates rather than silent deletion.
6. No unexplained model items.

## 2. Status Board

| Task ID | Task Description                                    | Owner      | Status                 |
| ------- | --------------------------------------------------- | ---------- | ---------------------- |
| T0.1    | Recon: rules, data model, auth model                | Main Agent | Done                   |
| T0.2    | Recon: services, pages, UI components               | Main Agent | Done                   |
| T0.3    | Recon: tests, CI, build configuration               | Main Agent | Done                   |
| T0.4    | Create and maintain PROGRESS.md                     | Main Agent | Done                   |
| T1.1    | Plan, permission matrix, module list, estimates     | Main Agent | Done (Gate 1 approved) |
| T2.1    | Role helpers, rules, indexes, rules emulator tests  | Main Agent | Done                   |
| T2.2    | Admin access service and admin shell                | Main Agent | Done                   |
| T2.3    | Vite routing, Firebase hosting rewrite, nav entry   | Main Agent | Done                   |
| T2.4    | Foundation tests, docs, commit, present Gate 2 diff | Main Agent | Done (Gate 2)          |
| T2.5    | Expand five-role rules matrix to 84 tests           | Main Agent | Done                   |
| T3.1    | Overview module                                     | Main Agent | Done                   |
| T3.2    | Users and writer-verification module                | Main Agent | Done                   |
| T3.3    | Tale deletion moderation module                     | Main Agent | Done                   |
| T3.4    | Comment and report queue module                     | Main Agent | Done                   |
| T3.5    | Author applications module                          | Main Agent | Done                   |
| T3.6    | Audit log module                                    | Main Agent | Done                   |
| T3.7    | Site settings module                                | Main Agent | Removed (inert flags)  |
| T3.8    | Author own-content section                          | Main Agent | Done                   |
| T3.9    | Global tales/chapters and comments moderation views | Main Agent | Done                   |
| T4.1    | Independent module reviews and remediation          | Subagents  | Done                   |
| T5.1    | Lint, typecheck, tokens, rules, unit, build         | Main Agent | Done                   |
| T5.2    | Live admin verification at 390 px and 1440 px       | Main Agent | Done                   |
| T5.3    | Guest and ordinary-user E2E denial paths            | Main Agent | Done                   |
| T6.1    | Handoff summary and merge instructions              | Main Agent | Done                   |

## 3. Current Activity

- **State:** Implementation, security hardening, remediation, and fake-feature
  removal are complete on `feature/admin-dashboard`. The nine-module dashboard
  includes global Tales & Chapters and Comments views. The branch is pushed to
  `origin/feature/admin-dashboard` and ready for review and merge by the user;
  it has not been merged.
- **Last action:** Removed every dashboard control that promised an effect the
  application does not deliver. The Site Settings module, its service, tests,
  CSS, and registry entry are gone because no reader bundle reads
  `featureFlags` or `appConfig`. The Users role selector and ban control are
  gone because profile `role` cannot grant a custom claim and no reader surface
  enforces `isBanned`. Users now exposes only writer verification, which
  `getAuthorStatus()` genuinely consumes. The Overview count is labelled
  "Reader Profiles" and counts `users/{uid}` documents, not Auth accounts.
  Verification is re-run after the removal and recorded in section 9.
- **Next steps:**
  1. Review the branch diff and the evidence in section 9.
  2. Merge only with explicit user approval, using a non-fast-forward merge.
  3. Assign or remove staff claims through the local Admin SDK procedure in
     `docs/admin-dashboard/OPERATIONS.md`.

## 4. Plan

Phase 2 (main agent, shared foundation):

- Redefine role helpers without changing existing `isAdmin()` behaviour:
  `isModerator()` = admin or moderator; `isAdministrator()` = admin only.
- Add `adminAuditLogs` (append-only), `authorApplications`, and an administrator
  branch for user moderation flags.
- Tighten `appConfig` and `featureFlags` writes to administrator only.
- Add refs/paths for reports, moderation logs, audit logs, applications, and
  app config.
- Add the admin access service, audit service, pagination helper, admin page
  shell, Vite page entry, hosting rewrite, and conditional nav entry.
- Add rules emulator tests covering all five roles and unit tests for the access
  service and shell helpers.

Phase 3 (parallel subagents, disjoint file ownership): one module each. Every
module owns its page module, its service, its CSS, and its tests. Shared files
are read-only to subagents.

Phase 4: four independent read-only reviews (security/rules, quota/performance,
accessibility/UX, test coverage).

Phase 5: `npm run lint`, `npm run type-check`, `npm run test:rules`,
`npm test`, and the relevant E2E suite. Test count must not decrease.

Phase 6: handoff with verification evidence, rules/index diff summary, role
assignment procedure, and merge instructions. No merge to main.

## 5. Done Log (append-only)

- [2026-10-21 00:00] Phase 0 recon completed. Created PROGRESS.md and the todo
  list.
- [2026-10-21 00:00] Gate 1 proposal delivered. User approved all defaults:
  custom-claim roles, the five-role permission matrix, seven modules plus author
  section, route `admin.html`, audit logging, and confirmation dialogs.
- [2026-10-21 00:00] Phase 2 started: foundation files and rules design.
- [2026-10-21 00:00] Added role helpers, the administrator users update branch,
  append-only `adminAuditLogs`, applicant-owned `authorApplications`, and
  administrator-only site configuration writes. No existing permission widened.
- [2026-10-21 00:00] Added four composite indexes for author deletion requests,
  reports, and applicant/status author-application pagination.
- [2026-10-21 00:00] Added paths/refs, admin access/audit/pagination services,
  the admin HTML shell, templates, utilities, state, CSS, Vite entry, hosting
  rewrite, and a claim-gated staff nav entry.
- [2026-10-21 00:00] Added five-role rules emulator coverage and unit tests for
  access resolution, templates, formatting, and the staff nav entry.
- [2026-10-21 00:00] Phase 2 validation passed: lint, type-check, token lint,
  full unit suite, rules emulator suite, and production build.
- [2026-10-22 00:00] Expanded five-role rules matrix to 77 tests (T2.5). All new
  admin gates covered with allowed and denied cases for every role.
- [2026-10-22 00:00] Phase 2 complete. Gate 2 ready for approval.
- [2026-10-22 12:00] Gate 2 APPROVED. Phase 3 module work completed. All 8 modules built directly.
- [2026-10-22 19:08] Fixed missing CSS classes (admin-badge, admin-btn, admin-content-stack, etc.) for my-content module; moved misplaced test file to correct path. All checks re-passed.
- [2026-10-23 00:00] Hardened the audit, settings, and author modules. Audit reads guard malformed actor roles, surface service errors, and search/load more through delegated events. Settings writes now resolve the real staff identity, merge-create config and flag documents, and merge stored flags with four disabled defaults. The author section moved to `modules/author/author.js`, dropped the rules-denied reports panel, validates the 5-2000 character reason, and uses a server timestamp for petitions. Targeted tests, ESLint, and Prettier pass.
- [2026-10-23 00:00] Rewrote the users module against the real `users` collection with name/newest sorting, UID lookup, cursor pagination, profile details, live tale counts, and rule-safe moderation writes that record the acting staff member.
- [2026-10-23 00:00] Rewrote the deletion, report, application, audit, settings, and overview flows: real data only, real staff identity on every mutation and audit entry, server timestamps, atomic approval deletion, and author-workspace grants on application approval.
- [2026-10-23 00:00] Fixed the admin module loader path, removed the icon hydration mutation loop, registered missing icons, and added a static icon coverage test across every admin template and module.
- [2026-10-23 00:00] Deployed the branch Firestore rules and indexes to project `taletranscend`; emulator suite passed 77 tests before deployment. All composite indexes reached READY.
- [2026-10-23 00:00] Created the missing `users/{uid}` profile for the test administrator and verified the admin claim. Live verification passed all nine routes at 390 px and 1440 px with zero page errors, console errors, or horizontal page overflow.
- [2026-10-23 00:00] Reviewer-driven hardening: deletion petitions must target a tale the petitioner owns; deletion, report, and application decisions only apply to pending documents; staff decisions record the caller as reviewer; owner profile writes cannot set `isBanned`, `isVerifiedWriter`, or a staff `role`. Deletion approval now refuses a missing or mismatched tale and describes removal of the public record without claiming subcollection erasure. Added Author Studio link for registered authors and title-to-ID resolution for removal petitions.
- [2026-10-23 00:00] Re-verified hardened branch: 81/81 rules tests, 1,179 unit tests passed (2 skipped), 16/16 admin denial E2E, lint, token lint, type-check, format check, and build all pass. Hardened rules deployed to project `taletranscend`.
- [2026-10-23 00:00] Fixed dashboard section navigation. `src/views/admin.html` carried `<base href="/">`, which resolved every `#/<module>` link against the site root and sent clicks to the public home page (`/#/users`) instead of the dashboard (`/admin.html#/users`). Removed the base tag and added an E2E regression that checks hash links resolve inside the admin document. All nine sections now navigate on both `/admin.html` and `/admin` with no reload or module error.
- [2026-10-23 12:00] Added the two missing global data views. `Tales & Chapters` lists every tale including drafts with status/title filtering, cursor pagination, detail, rule-safe title/status/visibility edits, chapter inspection, and confirmed deletion. `Comments` lists every comment through a collection-group query with visible/hidden/pinned filters, detail, hide/unhide, pin/unpin, and deletion. Both write append-only audit entries. Added the admin-only content registry entry and the staff comments entry, module descriptions, and the Users note explaining profile documents versus Firebase Auth accounts.
- [2026-10-23 12:00] Made comment moderation visible. Tale and reader comment queries now exclude `isHidden` comments and sort `isPinned` comments first. Added the database-root collection-group read rule for staff and five composite indexes: tale status/updatedAt, tale status/title, tale comments taleId/isHidden/isPinned/createdAt, and collection-group comments isHidden/createdAt and isPinned/createdAt.
- [2026-10-23 12:00] Backfilled legacy comment flags. The live project had 51 of 88 comments without `isHidden` and `isPinned`; equality queries would have hidden them from both the public surfaces and the admin list. A non-destructive Admin SDK batch set only the two missing booleans to `false`; all other fields and timestamps were untouched. After the backfill: 88 total, 0 missing, 8 pinned.
- [2026-10-23 12:00] Verification for the global views: 1,222 unit tests passed across 131 files (2 skipped), 84/84 rules-emulator tests passed, type-check, ESLint, token lint, format check, and production build passed. The collection-group rule was moved to the database root after the emulator proved a nested wildcard does not authorise a collection-group query. The tale comment test Firestore mock gained `where` after the new hidden filter was added.
- [2026-10-24 00:00] Removed inert dashboard features after auditing every control against a real consumer. Deleted the Site Settings module, service, tests, CSS, and registry entry: its four feature flags (`betaAccess`, `darkMode`, `newReaderFlow`, `enhancedSearch`) were invented defaults, and no reader bundle reads `featureFlags` or `appConfig`. Removed the Users role selector and Ban/Unban controls: profile `role` cannot grant a custom claim, and no reader surface checks `isBanned`. Users now exposes only `isVerifiedWriter`, which `getAuthorStatus()` reads to unlock Author Studio. Relabelled Overview "Registered Users" to "Reader Profiles" and renamed the counter to `totalProfiles` so the number is not mistaken for Firebase Auth accounts. Kept `refs.appConfig`, `refs.featureFlags`, their paths, and their rules for any external consumer.
- [2026-10-25 00:00] Completed the admin panel review. Fixed fifteen `showToast({ type, message })` call sites that rendered `[object Object]`, and hardened `showToast` to accept that legacy shape and `Error` values. Unknown, malformed, and role-denied hashes now render a generic denial state instead of silently showing dashboard home. Added server-side prefix search to Deletions (`taleId`), Reports (`targetId`), and Applications (`penName`) with status-aware composite indexes; search focus survives the loading render. Added settings-inspired section headers, removed the phantom global-nav offset, and unified the Audit pagination chrome. Corrected the permission matrix: Tales & Chapters remains administrator-only, matching the registry and module guard. Tightened `firestore.rules` so tale full updates and tale/chapter deletion require `isAdministrator()`; moderators keep read access for report triage.

## 7. Review Findings and Resolution

### Security

- All staff collections are gated by `isAdministrator()` or `isModerator()`.
- `adminAuditLogs` remains append-only; the actor role must match the caller's
  custom claim.
- `authorApplications` decisions are administrator-only and limited to the four
  decision fields; only pending applications can be decided.
- The administrator branch on `users` allows only `isBanned`,
  `isVerifiedWriter`, `role`, and `updatedAt`. Owner create/update branches reject
  self-granted moderation flags and staff roles.
- A deletion petition can only be created for a tale owned by the petitioner.
  Staff decisions require a pending petition and record the caller as reviewer.
- `appConfig` and `featureFlags` writes are administrator-only.
- Tale full updates and tale/chapter deletion require `isAdministrator()`. The
  admin-only Tales & Chapters module and the documented matrix now match the
  rules; moderators retain read access to a tale while triaging a report.
- Every staff mutation now records the real acting user. Earlier code wrote the
  affected user or applicant as the actor and hardcoded a role; that is fixed.
- Rules were not weakened. The deployed rules passed the 81-test emulator suite.

### Code Quality

- All modules follow the same `mount({container, access, navigate})` and cleanup
  contract.
- All modules use event delegation; no `window.handle*` globals or inline
  handlers remain.
- All interpolated values pass through escaping helpers.
- List queries are cursor-paginated and bounded.
- Destructive actions use confirmation dialogs; deletion approval is described
  as removal of the public tale record and as irreversible from the dashboard.
- Static icon coverage now scans admin templates, the access service, and every
  admin module so a missing icon fails a unit test.

### Tests and Verification

- 81 Firestore rules tests cover all five roles, including deletion ownership,
  concurrent decisions, and self-granted moderation flags.
- Full unit suite: 127 files, 1,179 passed, 2 skipped, 0 failed.
- Admin-specific unit coverage: access, session, audit, users, overview,
  deletion, reports, applications, author, templates, utilities, and module
  interaction tests.
- Admin E2E: 16 passed across guest denial, direct-route denial, mobile layout,
  and noindex metadata.
- Live verification: nine routes at 390 px and 1440 px, zero page errors, zero
  console errors, zero page-level horizontal overflow.

### UX

- Loading, empty, error, and success states are implemented per module.
- Tables scroll horizontally inside their wrapper on narrow screens rather than
  overflowing the page.
- Token-only colors; no raw color literals.
- No emojis and no decorative badge or status-dot patterns.
- Actions are keyboard-reachable native buttons, with visible focus states from
  the shared component styles.

## 6. Decisions

- **D-01:** Authority is custom claims only. `users/{uid}.role` is display data,
  never authority. This mirrors the existing `isCurrentUserAdmin()` and
  `isAdmin()` contract.
- **D-02:** Keep `isAdmin()` as the backward-compatible "admin or moderator"
  helper so every existing rule keeps its current meaning; add
  `isAdministrator()` for admin-only capabilities and `isModerator()` as the
  explicit name for the existing helper.
- **D-03:** Audit logs are append-only from the client's perspective
  (`update`/`delete` denied) and readable only by administrators. Moderators may
  create entries because their moderation actions must be logged.
- **D-04:** Author applications are created by the applicant, readable by the
  applicant or staff, and decided only by an administrator.
- **D-05:** The dashboard no longer offers a role selector. Custom claims are an
  Admin SDK operation, and a `users/{uid}.role` write cannot grant one. The
  Users module states that staff claims are the authority and directs claim
  changes to the documented local procedure.
- **D-06:** The dashboard no longer offers a ban control. `isBanned` is stored on
  some profiles, but no reader surface enforces it and the client cannot revoke
  a Firebase session. Ban enforcement would require a custom claim or a
  server-side check, so the control was removed rather than promising an effect
  the application does not deliver.
- **D-08:** The Site Settings module was removed. No reader bundle consumes
  `featureFlags` or `appConfig`, so every toggle and read-only configuration row
  was inert. The refs, paths, and rules stay in place for a future external
  consumer; only the dashboard surface was deleted.
- **D-07:** No unbounded listeners in the admin area. All list modules use
  cursor pagination with a fixed page size and a "load more" control.

## 7. Open Questions and Answers

- **Q:** How are roles assigned without committing credentials?
  **A:** A local Admin SDK procedure reads credentials from the developer's
  environment, never from the repository. The exact command is documented in the
  Phase 6 handoff. No key file is added.
- **Q:** Can the browser change another user's role?
  **A:** No. Custom claims are an Admin SDK operation. The dashboard no longer
  exposes a role switch at all; it explains that claims are the authority and
  points to the local procedure.
- **Q:** Why is there no Settings module?
  **A:** It edited `appConfig/site` and four feature flags that no reader bundle
  reads. Removing it keeps the dashboard limited to controls with a real effect.
  The underlying refs and rules remain for an external consumer.
- **Q:** Are full-collection counts allowed?
  **A:** Only through Firestore count aggregation where the rules permit the
  collection read. Counts are billed as index reads, are capped by query
  constraints, and each module records its estimate. Where rules make a count
  impossible, the UI shows an explicit unavailable state, not a fabricated
  number.
- **Q:** Does the dashboard need Cloud Functions?
  **A:** No. The project stays on Spark. All work is client-side plus rules.

## 8. Risks, Blockers and Assumptions

- **Risk:** Count aggregation requires collection-level read permission. Tales
  and comments use document-dependent read rules. The overview module must probe
  this in the emulator and fall back to an explicit unavailable state.
- **Risk:** The global views added five new query combinations. Their indexes
  were deployed and verified READY through the Firebase Admin API. Any future
  query that adds a filter or sort combination needs a matching index
  deployment.
- **Risk:** The collection-group comment read rule lives at the database root,
  not inside the application path. That is required for collection-group
  queries, but it means a future second application sharing this database would
  inherit the staff claim check. The database is currently dedicated to
  TaleTranscend.
- **Risk:** Comment documents created before this delivery may be missing
  `isHidden`/`isPinned`. Public and admin queries require those fields. A live
  non-destructive backfill normalised 51 of 88 comments; any future importer or
  legacy writer must write both flags.
- **Risk:** The global Users table cannot enumerate Firebase Auth accounts. It
  reads `users/{uid}` profile documents only. Anonymous sessions without a
  profile are intentionally absent, and listing Auth accounts requires
  server-side Admin SDK access that this Spark-plan project does not have.
- **Risk:** Global comment queries depend on the new collection-group indexes
  and the root read rule being deployed together. A rules-only deployment would
  leave the module unable to list comments.
- **Risk:** A ban flag in `users/{uid}` does not lock the account. The rules do
  not read the profile on every request because that would add a read to every
  write. Ban enforcement remains a server-side/claim task, which is why the
  dashboard no longer exposes a ban toggle.
- **Risk:** Approving a deletion removes the tale document; chapter and comment
  subcollections are not cascaded by Firestore and require a trusted server-side
  cleanup job. The UI and notification therefore say the public record was
  removed, not that every subcollection was erased.
- **Risk:** E2E covers guest and ordinary-user denial only. Staff flows are
  covered by service and module tests plus the existing live authenticated
  verification; seeding a staff user into the Auth emulator for the new global
  views remains future work.
- **Limitation:** Admin tables scroll horizontally inside their wrapper on narrow
  screens. This keeps every column reachable without causing page overflow.
- **Assumption:** Spark plan limits apply: 50k reads/day and 20k writes/day.
  Every module must stay within the per-screen budgets in section 10.
- **Assumption:** The existing test count is the floor. Tests may be added or
  strengthened, never deleted or skipped.

## 9. Verification Results

Commands were run in the admin worktree on 2026-10-23 and re-run after the
fake-feature removal on 2026-10-24.

| Check                          | Command                                                            | Result                                                                                |
| ------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Full unit suite (post-removal) | `npm test`                                                         | 129 files; 1,205 passed, 2 skipped, 0 failed                                          |
| Admin unit subset (post)       | `npx vitest run src/services/admin src/pages/admin --maxWorkers=2` | 187 passed, 0 failed                                                                  |
| Firestore rules (post)         | `npm run test:rules`                                               | 84 passed, 0 failed                                                                   |
| Formatting (post)              | `npm run format`                                                   | All files match Prettier style                                                        |
| ESLint (post)                  | `npm run lint`                                                     | No issues found                                                                       |
| Design tokens (post)           | `npm run lint:tokens`                                              | No raw color literals outside the design system                                       |
| Type check (post)              | `npm run type-check`                                               | No errors                                                                             |
| Production build (post)        | `npm run build`                                                    | Completed; `content` and `comments` chunks plus PWA precache generated                |
| Entry paths (post)             | Playwright, 390 px and 1440 px                                     | `/admin.html` and `/admin` returned 200, denied state rendered, no overflow or errors |
| Admin denial E2E               | `npx playwright test e2e/specs/admin-access.spec.js --workers=1`   | 20 passed, 0 failed (2026-10-23)                                                      |
| Sidebar navigation             | `.tmp/verify-nav.mjs`                                              | Nine sections on `/admin.html` and `/admin`; no reload, no module errors (2026-10-23) |
| Live authenticated UI          | `.tmp/verify-admin.mjs`                                            | 9 routes at 390 px and 1440 px; 0 failures, 0 page errors, 0 overflow (2026-10-23)    |
| Live users flow                | `.tmp/verify-admin.mjs`                                            | Search `Leo` returned 1 row; detail panel opened with real profile (2026-10-23)       |
| Legacy flag backfill           | `.tmp/backfill-comment-flags.mjs`                                  | 88 scanned; 51 updated; final 0 missing `isHidden`/`isPinned`; 8 pinned               |

The authenticated live pass predates the fake-feature removal. It was not
repeated on 2026-10-24 because this machine has no service-account or
application-default credentials available to mint a staff token; the
unauthenticated entry-path check above and the module/service unit tests cover
the changed code. Re-run the authenticated script after credentials are
available before merging.

Rules and indexes were deployed with:

```powershell
npx firebase deploy --only firestore:rules --project taletranscend --non-interactive
npx firebase deploy --only firestore:indexes --project taletranscend --non-interactive
```

All four new composite indexes were confirmed READY before the final live run.

## 10. Free-Tier Estimates per Screen

Estimates are per first page load, with page size 20 unless noted. Count
aggregations are billed as one read per 1,000 index entries.

| Screen              | Reads (first load)                                              | Writes per action                                                                 |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Admin shell / guard | 0 for staff (cached claims); 1 profile read for an author       | 0                                                                                 |
| Overview            | 5 count aggregations + 5 recent audit entries = about 10        | 0                                                                                 |
| Users and roles     | 20 user documents                                               | 1 profile update + 1 audit = 2                                                    |
| Tale deletion queue | 20 requests                                                     | atomic request update + tale delete, then audit + optional notification = up to 4 |
| Report queue        | 20 reports                                                      | update report + audit = 2                                                         |
| Author applications | 20 applications                                                 | atomic application + author-role update, then audit = 3                           |
| Audit log           | 20 entries                                                      | 0                                                                                 |
| Author own content  | 20 own tales + 10 own deletion requests = 30                    | 1 deletion request = 1                                                            |
| Tales & chapters    | 20 tales; detail adds 1 tale + up to 50 chapters + 1 count = 72 | update + audit = 2; delete + audit = 2                                            |
| Global comments     | 20 comments; detail adds 1 comment + parent tale = 22           | hide/pin/delete + audit = 2                                                       |

No screen uses an unbounded `onSnapshot`. No screen reads a collection in a
loop. No screen fetches a full collection for statistics.

## 11. Confirmed Permission Matrix

| Capability                            | Guest  | User   | Author              | Moderator | Admin   |
| ------------------------------------- | ------ | ------ | ------------------- | --------- | ------- |
| Open `admin.html`                     | Denied | Denied | Author section only | Allowed   | Allowed |
| Global overview stats                 | Denied | Denied | Denied              | Allowed   | Allowed |
| Own content summary                   | Denied | Denied | Allowed             | Denied    | Allowed |
| List users                            | Denied | Denied | Denied              | Denied    | Allowed |
| Browse every tale in Tales & Chapters | Denied | Denied | Denied              | Denied    | Allowed |
| Edit tale title/status/visibility     | Denied | Denied | Own tales only      | Denied    | Allowed |
| Delete a tale                         | Denied | Denied | Denied              | Denied    | Allowed |
| Change writer verification            | Denied | Denied | Denied              | Denied    | Allowed |
| Moderate tale deletions               | Denied | Denied | Denied              | Allowed   | Allowed |
| Read every comment                    | Denied | Denied | Denied              | Allowed   | Allowed |
| Hide/pin/delete comments              | Denied | Denied | Denied              | Allowed   | Allowed |
| Moderate reports                      | Denied | Denied | Denied              | Allowed   | Allowed |
| Read author applications              | Denied | Denied | Own only            | Allowed   | Allowed |
| Decide author applications            | Denied | Denied | Denied              | Denied    | Allowed |
| Read audit log                        | Denied | Denied | Denied              | Denied    | Allowed |
| Write audit entry                     | Denied | Denied | Denied              | Allowed   | Allowed |

## 12. Changelog of Rules and Index Changes

### Rules (Phase 2)

- Added `isModerator()` (admin or moderator) and `isAdministrator()` (admin only).
  `isAdmin()` kept as an alias of `isModerator()` for backward compatibility.
- Added `adminAuditLogs/{logId}`: create by moderator/admin with actor identity
  and an actor role that matches the caller's claim; read by administrator;
  update/delete denied.
- Added `authorApplications/{applicationId}`: create by the applicant; read by
  the applicant or staff; decide by administrator.
- Added an administrator update branch on `users/{userId}` limited to
  `isBanned`, `isVerifiedWriter`, `role`, and `updatedAt`. Owner create/update
  branches reject self-granted moderation flags and staff roles.
- Tightened `appConfig/{docId}` and `featureFlags/{flagId}` writes from
  moderator/admin to administrator only.
- Deletion petitions now require an existing tale owned by the petitioner,
  `pending` status, and a bounded field set. Decisions only apply to pending
  petitions, use a bounded decision field set, and record the caller as reviewer.
- Report and author-application decisions now require a pending source document,
  a bounded decision field set, and the caller as reviewer. This closes the
  concurrent-decision race without weakening staff authority.
- Existing moderation-log, tale, comment, and user delete rules keep their
  current authority. No existing permission was widened.

### Rules (Global data views)

- Added a database-root collection-group read rule for `comments`: staff only
  (`isAdmin()`, which includes moderators). Nested comment rules still authorise
  updates and deletes, including the field checks on `isHidden`, `isPinned`, and
  `reportCount`.
- The rule must stay outside `match /v1/taletranscend/projects/v1`; a wildcard
  nested under a document path does not authorise a collection-group query.

### Indexes (Global data views)

- `tales`: `status` ascending, `updatedAt` descending (global content list).
- `tales`: `status` ascending, `title` ascending (status-filtered title search).
- `comments`: `taleId` ascending, `isHidden` ascending, `isPinned` descending,
  `createdAt` descending (public hidden filter and pinned-first order).
- `comments` collection group: `isHidden` ascending, `createdAt` descending
  (global all/visible/hidden filters).
- `comments` collection group: `isPinned` ascending, `createdAt` descending
  (global pinned filter).

### Indexes (Phase 2)

- `deletionRequests`: `userId` ascending, `createdAt` descending (author's own
  petition history). Existing `deletionRequests (status, createdAt)` remains for
  the moderation queue.
- `reports`: `status` ascending, `createdAt` descending.
- `authorApplications`: `status` ascending, `createdAt` descending.
- `authorApplications`: `applicantId` ascending, `createdAt` descending.
- `adminAuditLogs`: `createdAt` descending is a single-field automatic index; no
  composite entry needed.
- Existing `tales (status, publishedAt)` remains sufficient for its query.

### Indexes (Admin search)

- `deletionRequests`: `status` ascending, `taleId` ascending (status-filtered
  tale-id prefix search).
- `reports`: `status` ascending, `targetId` ascending (status-filtered
  target-id prefix search).
- `authorApplications`: `status` ascending, `penName` ascending
  (status-filtered, case-sensitive pen-name prefix search).

All declared rules and indexes were deployed to project `taletranscend` on
2026-10-23. The four Phase 2 indexes are READY. The five global-view indexes
were verified READY through the Firebase Admin API, and the `comments`
collection-group read rule is deployed at the database root.

## 13. Moderation & Support Extension (`feature/moderation-support`)

### Scope delivered

This branch builds on `feature/admin-dashboard` and adds a complete moderation
and support loop across the public site and dashboard:

- Soft deletion for tales, comments, and replies, with deletion metadata,
  staff-only text archives, a cursor-friendly registry, restore, and separately
  confirmed permanent removal.
- An administrator-only Deletions registry with type/status/title filters,
  detail views, related reports, and all-or-nothing bulk removal of up to 50
  tales. Deletion-petition approval is administrator-only; moderators can still
  reject a pending petition.
- An accessible community-guidelines dialog and contextual report entry points
  for comments, replies, tales, the tale-not-found screen, the global 404 page,
  and Settings.
- A registered-reader report history with Submitted, Under Review, Responded,
  Resolved, and Closed states, plus the exact administrator-review notice and
  the developer contact `leo.two.dev@gmail.com`.
- Staff report triage with subject, category, description, private notes,
  user-visible responses, status transitions, and filtering.
- Administrator-to-reader inbox messages delivered through the existing
  notification collection, with rule-enforced recipient and reporter privacy.

### Data model additions

| Collection           | Purpose                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `reports`            | Staff-visible report record with target context, category, description, status, responses, reviewer |
| `reportHistory`      | Reporter-safe mirror; status and user-visible responses only, no private notes                      |
| `reportPrivateNotes` | Staff-only triage notes keyed by report ID                                                          |
| `softDeletions`      | Registry of removed tales/comments/replies with restore and purge state                             |
| `moderationArchive`  | Staff-only archived comment/reply text                                                              |

Soft-deleted entities keep their document IDs and relationships. Tales store
`previousStatus` and `previousVisibility`; comments/replies archive original
text before clearing the public field. The public read paths reject
`isDeleted == true` and `status == 'deleted'`.

### Decisions

- Soft deletion is the default for every content-removal surface. Permanent
  deletion is a second, administrator-confirmed action and never happens from
  the ordinary moderation flow.
- Deletion petitions remain a separate author-initiated workflow. Approval now
  soft-removes the tale and registers it for restoration rather than erasing it.
  Approval requires an administrator because it writes administrator-only tale
  deletion fields and registry entries; rejection stays available to moderators.
- Report history is intentionally a separate mirror so reporter reads never
  depend on staff-only fields. Rules deny cross-reporter access. Resolved and
  closed reports are immutable for responses, matching the rules.
- Permanent purge deletes the entity and marks its registry entry `purged` in one
  batch. Comment archives retain `previousIsHidden`, so restore cannot reveal a
  comment that was hidden before removal.
- Existing `users/{uid}/notifications` is the inbox. No second messaging
  collection was introduced.
- Chapter registry entries are supported for future work, but chapter-level
  removal is not exposed in this delivery. Tale removal covers its chapters.

### Rules and indexes

Rules add:

- Report target types for tale/comment/reply/user/page/website, bounded report
  updates, and closed-report immutability.
- Reporter-owned `reportHistory` creation/read, staff updates, and staff-only
  `reportPrivateNotes` and `moderationArchive`.
- Staff-readable/creatable `softDeletions`; tale registry writes require
  `isAdministrator()`.
- Public denial for soft-deleted tales, comment/reply creation under deleted
  parents, likes on deleted comments, and edits to deleted comments/replies.
- Administrator-only tale restore/purge fields and statuses.
- Deletion-request approval requires `isAdministrator()`; moderators may still
  reject a pending petition.

Indexes add reporter history ordering, soft-deletion registry filters, and a
collection-group `comments(isDeleted, createdAt)` index. See
`firestore.indexes.json` for the exact definitions.

### Verification

- Unit suite: 134 test files, 1,260 passed, 2 skipped (1,262 total).
- Rules emulator: 99/99 passed against the Firestore emulator, including the
  full 50-tale bulk removal batch.
- `npm run format`, `npm run lint` (0 errors), `npm run lint:tokens`,
  `npm run type-check`, and `npm run build` all passed.
- Browser E2E and a live authenticated walkthrough were not run for this
  branch; coverage comes from the unit, integration, and rules suites.
- Do not treat historical numbers in sections 9 and 12 as evidence for this
  extension.

### Follow-up audit fixes (2026-10-26)

A post-deployment audit of client/rules/index mismatches found and fixed five
issues:

- Moderators could open a deletion petition and attempt approval, but the tale
  deletion and registry writes require an administrator. Approval is now hidden
  in the UI and rejected by the service before any read or write; the
  `deletionRequests` rule also requires `isAdministrator()` for approval.
- The report service allowed a response to a `resolved` report, while the rules
  make resolved and closed reports immutable. The service now rejects both.
- Reply reports had no target summary in the admin detail. The summary now
  resolves the parent tale/comment and the reply body.
- Permanent removal of a tale, comment, or reply deleted the entity and updated
  the registry in two separate writes. Both writes now commit in one batch.
- Restoring a comment lost its previous `isHidden` state. The archive now stores
  `previousIsHidden` and restore uses it.

Regression coverage adds nine unit tests and one rules-emulator test (the
50-tale batch). Full verification after the fixes: 134 unit files, 1,260 passed,
2 skipped; rules 99/99; format, lint, token lint, type-check, and build clean.

The follow-up `firestore.rules` change was deployed to project `taletranscend`
on 2026-10-26 and verified in the deployed source: petition approval now
requires `isAdministrator()` at the rule layer as well as in the UI and service.
No index changes were part of this follow-up; the indexes deployed on
2026-10-25 remain in place, and all required moderation indexes report `READY`.

### Deployment

```powershell
npm run format
npm run lint
npm run lint:tokens
npm run type-check
npm test
npm run test:rules
npm run build
firebase deploy --only firestore:rules,firestore:indexes
```

Deploy rules and indexes together: the new report/soft-deletion queries and
collection-group comment filter depend on both. No data migration is required
for existing documents; legacy content simply has no `isDeleted` field and is
treated as active. Backfill is only needed if a future query requires an
explicit `isDeleted == false` equality, which this delivery does not.

Released to project `taletranscend` on 2026-10-25 from this branch. The first
live report attempt exposed the deployment gap: `createReport` writes `reports`
and `reportHistory` in one batch, and the previously deployed ruleset had no
`reportHistory` rule, so Firestore denied the whole batch. Deploying this
branch's rules and indexes resolved it. Until the branch is merged, a rules
deploy from `main` would replace the moderation/support rules.

### Assumptions and limitations

- Existing anonymous sessions are guests; reporting requires a registered
  account in both UI and rules.
- Permanent deletion does not cascade subcollections. The registry and staff
  archive preserve evidence, but chapter/comment cleanup after a permanent tale
  purge remains a trusted server-side task.
- Chapter-level soft deletion is represented in the registry schema but has no
  dedicated UI or rule branch in this delivery.
- Report responses are delivered to the existing notification inbox; they do
  not send email. The Settings notice explains the three-business-day response
  expectation and provides the developer address.
- The admin dashboard remains table-first and cursor-paginated. Bulk removal is
  limited to 50 tales per operation to stay within free-tier write budgets.

## 14. Settings Inbox (`feature/user-inbox`)

### Scope delivered

The Settings page now exposes the reader's full message history as a dedicated
Inbox section between Accounts and Support & Reports. It reads the existing
`users/{uid}/notifications` collection, so administrator responses, direct staff
messages, moderation notices, and system notices all share one archive.

- Cursor pagination returns 20 messages per page. Each query fetches one extra
  row to determine whether another page exists, so "Load older messages" only
  appears when the collection truly continues and the footer disappears when it
  is exhausted.
- Each entry shows its type, title, body, timestamp, and rectangular Unread and
  Pinned markers. Readers can mark one message or every unread message as read,
  and pin or unpin a message. Mark-all remains available while older pages may
  contain unread messages; the service sweeps unread batches until fewer than 50
  remain, up to a practical 1,000-message cap per click.
- Read failures surface an error state. A failed first page shows the archive
  error; a failed "Load older messages" request keeps the existing rows visible
  and reports the failure without clearing the list.
- Stored `actionUrl` values pass through `resolveSafeInternalHref` before an
  anchor is rendered. Absolute URLs, protocol-relative URLs, hash-only targets,
  non-web schemes, backslash/control-character escapes, and resolved URLs that
  leave the current origin are rejected.
- The message list is a labelled region with a separate screen-reader status
  announcer. Marking a message read focuses the row instead of dropping focus
  with the removed button, and per-message/bulk in-flight guards prevent duplicate
  writes from rapid clicks.
- Report responses and direct administrator messages now target
  `settings.html#section-inbox`. Moderation and system notices keep their
  tale/profile targets. If a report response is saved but the inbox notification
  cannot be delivered, staff see a warning and the audit record distinguishes the
  failed delivery.
- Signed-out visitors see a sign-in prompt; the page never reads another user's
  notifications. Any authenticated owner, including an anonymous Firebase
  session, sees only their own inbox. The notification rules already allow owner
  reads and updates limited to `isRead`, `readAt`, and `isPinned`, so no rules or
  indexes changed.

### Decisions

- The Settings Inbox is a full-history view over notifications, not a second
  messaging collection. This preserves the existing notification producers and
  the navigation popover while giving readers a durable, paginated archive.
- The inbox loads on auth state changes and uses a request token so a late page
  response cannot overwrite a newer account's list.
- Read and pin actions update the rendered row in place; mark-all-read updates
  the loaded page and lets the service page through additional unread batches.

### Verification

- Unit suite: 135 test files, 1,283 passed, 2 skipped (1,285 total), including
  the new inbox, notification paging, error-state, safe-link, focus, mark-all
  older-page, and report-delivery tests.
- Rules emulator: 99/99 passed. No rules or indexes changed for this feature.
- `npm run format`, `npm run lint` (0 errors), `npm run lint:tokens`,
  `npm run type-check`, and `npm run build` all passed.
- Browser E2E and a live authenticated walkthrough were not run; coverage comes
  from the unit and rules suites.

### Branch state

`feature/user-inbox` is based on `feature/moderation-support` at `4916d34`.
Neither branch is merged to `main`; explicit approval is required before any
merge. The production ruleset deployed on 2026-10-26 already permits the inbox's
owner-scoped notification reads and read/pin writes.
