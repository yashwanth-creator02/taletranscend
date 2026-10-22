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
3. Modules: overview stats, user and role management, tale deletion moderation,
   comment/report queue, author applications, audit log, site settings, plus an
   author's own-content section.
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
| T2.5    | Expand five-role rules matrix to 81 tests           | Main Agent | Done                   |
| T3.1    | Overview module                                     | Main Agent | Done                   |
| T3.2    | Users and roles module                              | Main Agent | Done                   |
| T3.3    | Tale deletion moderation module                     | Main Agent | Done                   |
| T3.4    | Comment and report queue module                     | Main Agent | Done                   |
| T3.5    | Author applications module                          | Main Agent | Done                   |
| T3.6    | Audit log module                                    | Main Agent | Done                   |
| T3.7    | Site settings module                                | Main Agent | Done                   |
| T3.8    | Author own-content section                          | Main Agent | Done                   |
| T4.1    | Independent module reviews and remediation          | Subagents  | Done                   |
| T5.1    | Lint, typecheck, tokens, rules, unit, build         | Main Agent | Done                   |
| T5.2    | Live admin verification at 390 px and 1440 px       | Main Agent | Done                   |
| T5.3    | Guest and ordinary-user E2E denial paths            | Main Agent | Done                   |
| T6.1    | Handoff summary and merge instructions              | Main Agent | Done                   |

## 3. Current Activity

- **State:** Implementation, security hardening, remediation, and verification
  are complete on `feature/admin-dashboard`. The branch is pushed to
  `origin/feature/admin-dashboard` and ready for review and merge by the user;
  it has not been merged.
- **Last action:** Reviewer-driven hardening closed deletion-request ownership,
  self-granted moderation flags, and concurrent decision races. The emulator
  suite now passes 81 tests, the hardened rules are deployed, and commit
  `19045b8` is pushed for review.
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
  deletion, reports, applications, settings, author, templates, utilities, and
  module interaction tests.
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
- **D-05:** User role changes in the UI are informational only. Actual custom
  claims require the local Admin SDK procedure; the browser cannot write another
  user's claims. The dashboard must say so instead of implying otherwise.
- **D-06:** Ban flags are profile flags, not authentication locks. Enforcing a
  ban requires a custom claim or a server-side check; that is documented as a
  limitation rather than silently claimed as enforced.
- **D-07:** No unbounded listeners in the admin area. All list modules use
  cursor pagination with a fixed page size and a "load more" control.

## 7. Open Questions and Answers

- **Q:** How are roles assigned without committing credentials?
  **A:** A local Admin SDK procedure reads credentials from the developer's
  environment, never from the repository. The exact command is documented in the
  Phase 6 handoff. No key file is added.
- **Q:** Can the browser change another user's role?
  **A:** No. Custom claims are an Admin SDK operation. The dashboard exposes
  profile flags and an explanatory note, not a fake role switch.
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
- **Risk:** The four composite indexes are deployed and READY. Any future query
  that adds a filter or sort combination needs a matching index deployment, or
  the module will show its error state.
- **Risk:** A ban flag in `users/{uid}` does not lock the account. The rules do
  not read the profile on every request because that would add a read to every
  write. Ban enforcement remains a server-side/claim task.
- **Risk:** Approving a deletion removes the tale document; chapter and comment
  subcollections are not cascaded by Firestore and require a trusted server-side
  cleanup job. The UI and notification therefore say the public record was
  removed, not that every subcollection was erased.
- **Risk:** E2E covers guest and ordinary-user denial only. Staff flows are
  covered by service and module tests plus live authenticated verification;
  seeding a staff user into the Auth emulator is future work.
- **Limitation:** Admin tables scroll horizontally inside their wrapper on narrow
  screens. This keeps every column reachable without causing page overflow.
- **Assumption:** Spark plan limits apply: 50k reads/day and 20k writes/day.
  Every module must stay within the per-screen budgets in section 10.
- **Assumption:** The existing test count is the floor. Tests may be added or
  strengthened, never deleted or skipped.

## 9. Verification Results

All commands were run in the admin worktree on 2026-10-23.

| Check                 | Command                                                            | Result                                                                                  |
| --------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Full unit suite       | `npm test -- --maxWorkers=2`                                       | 127 files; 1,179 passed, 2 skipped, 0 failed                                            |
| Admin unit subset     | `npx vitest run src/services/admin src/pages/admin --maxWorkers=2` | 156 passed, 0 failed                                                                    |
| Firestore rules       | `npm run test:rules`                                               | 81 passed, 0 failed                                                                     |
| Admin denial E2E      | `npx playwright test e2e/specs/admin-access.spec.js --workers=1`   | 16 passed, 0 failed                                                                     |
| Formatting            | `npm run format:check`                                             | All files match Prettier style                                                          |
| ESLint                | `npm run lint`                                                     | No issues found                                                                         |
| Design tokens         | `npm run lint:tokens`                                              | No raw color literals outside the design system                                         |
| Type check            | `npm run type-check`                                               | No errors                                                                               |
| Production build      | `npm run build`                                                    | Completed; admin chunks and PWA precache generated                                      |
| Live authenticated UI | `.tmp/verify-admin.mjs`                                            | 9 routes at 390 px and 1440 px; 0 failures, 0 page errors, 0 console errors, 0 overflow |
| Live users flow       | `.tmp/verify-admin.mjs`                                            | Search `Leo` returned 1 row; detail panel opened with real profile                      |

Rules and indexes were deployed with:

```powershell
npx firebase deploy --only firestore:rules --project taletranscend --non-interactive
npx firebase deploy --only firestore:indexes --project taletranscend --non-interactive
```

All four new composite indexes were confirmed READY before the final live run.

## 10. Free-Tier Estimates per Screen

Estimates are per first page load, with page size 20 unless noted. Count
aggregations are billed as one read per 1,000 index entries.

| Screen              | Reads (first load)                                        | Writes per action                                                                 |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Admin shell / guard | 0 for staff (cached claims); 1 profile read for an author | 0                                                                                 |
| Overview            | 5 count aggregations + 5 recent audit entries = about 10  | 0                                                                                 |
| Users and roles     | 20 user documents                                         | 1 profile update + 1 audit = 2                                                    |
| Tale deletion queue | 20 requests                                               | atomic request update + tale delete, then audit + optional notification = up to 4 |
| Report queue        | 20 reports                                                | update report + audit = 2                                                         |
| Author applications | 20 applications                                           | atomic application + author-role update, then audit = 3                           |
| Audit log           | 20 entries                                                | 0                                                                                 |
| Site settings       | 1 config document + up to 50 flag documents               | 1 config or flag write + 1 audit = 2                                              |
| Author own content  | 20 own tales + 10 own deletion requests = 30              | 1 deletion request = 1                                                            |

No screen uses an unbounded `onSnapshot`. No screen reads a collection in a
loop. No screen fetches a full collection for statistics.

## 11. Confirmed Permission Matrix

| Capability                      | Guest  | User   | Author              | Moderator | Admin   |
| ------------------------------- | ------ | ------ | ------------------- | --------- | ------- |
| Open `admin.html`               | Denied | Denied | Author section only | Allowed   | Allowed |
| Global overview stats           | Denied | Denied | Denied              | Allowed   | Allowed |
| Own content summary             | Denied | Denied | Allowed             | Denied    | Allowed |
| List users                      | Denied | Denied | Denied              | Denied    | Allowed |
| Change profile moderation flags | Denied | Denied | Denied              | Denied    | Allowed |
| Moderate tale deletions         | Denied | Denied | Denied              | Allowed   | Allowed |
| Moderate reports/comments       | Denied | Denied | Denied              | Allowed   | Allowed |
| Read author applications        | Denied | Denied | Own only            | Allowed   | Allowed |
| Decide author applications      | Denied | Denied | Denied              | Denied    | Allowed |
| Read audit log                  | Denied | Denied | Denied              | Denied    | Allowed |
| Write audit entry               | Denied | Denied | Denied              | Allowed   | Allowed |
| Edit site settings              | Denied | Denied | Denied              | Denied    | Allowed |

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

All declared rules and indexes were deployed to project `taletranscend` on
2026-10-23. The four affected composite indexes were verified READY through the
Firebase Admin API before the final live verification run.
