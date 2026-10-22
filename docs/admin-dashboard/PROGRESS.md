# Admin Dashboard Progress & Status (TaleTranscend)

> Persistent work log for the admin dashboard build. Updated before and after
> every task. Branch: `feature/admin-dashboard`. Never merged, pushed to main,
> or deployed from this worktree.

## 1. Goal and Confirmed Scope

**Goal:** a secure, role-gated admin dashboard for TaleTranscend, delivered on
branch `feature/admin-dashboard`, with Firestore rules as the authority (never
the UI alone), paginated free-tier-safe queries, emulator-based rules tests for
all five roles, and no production Firebase access.

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
| T2.5    | Expand five-role rules matrix to 77 tests           | Main Agent | Done                   |
| T3.1    | Overview module                                     | Main Agent | Done                   |
| T3.2    | Users and roles module                              | Main Agent | Done                   |
| T3.3    | Tale deletion moderation module                     | Main Agent | Done                   |
| T3.4    | Comment and report queue module                     | Main Agent | Done                   |
| T3.5    | Author applications module                          | Main Agent | Done                   |
| T3.6    | Audit log module                                    | Main Agent | Done                   |
| T3.7    | Site settings module                                | Main Agent | Done                   |
| T3.8    | Author own-content section                          | Main Agent | Done                   |
| T4.1    | Four independent read-only reviews                  | Subagents  | In Progress            |
| T5.1    | Lint, typecheck, rules emulator, unit, E2E          | Main Agent | Blocked on T4          |
| T6.1    | Handoff summary and merge instructions              | Main Agent | Blocked on T5          |

## 3. Current Activity

- **Doing right now:** Phase 3 module implementation. Eight modules in parallel,
  disjoint file ownership per subagent.
- **Stop condition:** All modules complete and tested; then Phase 4 reviews.
- **Next 3 steps:**
  1. Each module implements its UI + service + tests with disjoint file ownership.
  2. Main agent merges module outputs into `src/pages/admin/` without conflicts.
  3. Phase 4: four independent read-only reviews.

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
assignment procedure, and merge instructions. No merge, push, or deploy.

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
- **Risk:** Composite indexes are declared but not deployed. The user will deploy
  them later; until then, queries fail with a Firestore index link. No deploy is
  run from this worktree.
- **Risk:** A ban flag in `users/{uid}` does not lock the account. The rules do
  not read the profile on every request because that would add a read to every
  write. Ban enforcement remains a server-side/claim task.
- **Risk:** E2E custom-claim setup needs Auth emulator admin access. Rules tests
  cover all five roles authoritatively; E2E covers the guest and ordinary-user
  denial paths and any staff path that can be set up without production access.
- **Assumption:** Spark plan limits apply: 50k reads/day and 20k writes/day.
  Every module must stay within the per-screen budgets in section 10.
- **Assumption:** The existing test count is the floor. Tests may be added or
  strengthened, never deleted or skipped.

## 9. Verification Results

- Phase 0: repository structure, rules, paths, refs, Vite pages, Firebase
  rewrites, emulator ports, and test configuration inspected.
- Phase 2 (`npm run lint`): `ESLint: No issues found`.
- Phase 2 (`npm run type-check`): `tsc --noEmit` completed with no errors.
- Phase 2 (`npm run lint:tokens`): `token lint: no raw colour literals outside
the design system`.
- Phase 2 (focused unit, `npx vitest run src/pages/admin src/services/admin
src/ui/components/nav/__tests__/nav.staff.test.js`): 21 passed, 0 failed.
- Phase 2 (full unit, `npm test`): 110 test files passed; 1,033 tests passed,
  2 skipped (1,035 collected), 0 failed.
- Phase 2 (rules emulator, `npm run test:rules`): 1 test file passed; 77 tests
  passed, 0 failed after the five-role expansion covering author, user, moderator,
  administrator, and guest roles across all new admin gates.
- Phase 2 (`npm run build`): production build completed successfully; the admin
  entry (`admin-CJCX9wWe.js`) and PWA precache were generated.
- Phase 2 E2E: deferred to Phase 5. Guest and ordinary-user denial paths are
  already covered authoritatively by the rules emulator suite.

## 10. Free-Tier Estimates per Screen

Estimates are per first page load, with page size 20 unless noted. Count
aggregations are billed as one read per 1,000 index entries.

| Screen              | Reads (first load)                                        | Writes per action                                                      |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Admin shell / guard | 0 for staff (cached claims); 1 profile read for an author | 0                                                                      |
| Overview            | 5 count aggregations + 10 recent audit entries = about 15 | 0                                                                      |
| Users and roles     | 25 user documents                                         | 1 profile update + 1 audit = 2                                         |
| Tale deletion queue | 20 requests                                               | delete tale + update request + audit + optional notification = up to 4 |
| Report queue        | 20 reports                                                | update report + moderation log + audit = 3                             |
| Author applications | 20 applications                                           | update application + audit = 2                                         |
| Audit log           | 25 entries                                                | 0                                                                      |
| Site settings       | 1 config document                                         | 1 config write + 1 audit = 2                                           |
| Author own content  | 20 own tales + 10 own deletion requests = 30              | deletion request + audit = 2                                           |

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
  `isBanned`, `isVerifiedWriter`, `role`, and `updatedAt`.
- Tightened `appConfig/{docId}` and `featureFlags/{flagId}` writes from
  moderator/admin to administrator only.
- Existing report, moderation-log, deletion-request, tale, comment, and user
  delete rules keep their current authority. No existing permission was widened.

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
