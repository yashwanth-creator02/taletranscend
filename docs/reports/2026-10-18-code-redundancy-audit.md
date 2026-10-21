# Code Redundancy and Dead-Code Audit

- Date: 2026-10-18
- Branch: `feat/comprehensive-improvements`
- Commit: `ff5f123` ("chore(vercel): link working directory to the taletranscend Vercel project")
- Working tree: clean at the time of the audit

## Scope and method

Read-only audit of the committed state of the branch. The working tree was clean at
`ff5f123`; no source file was modified while producing this report.

Checks performed:

1. Symbol scan: every `export function` / `export async function` / `export const` /
   `export class` in `src/` was extracted and its name occurrence-counted across the whole
   repository (src, views, e2e, scripts, directives, docs, firestore). Symbols with a total
   count of one occur only at their definition and are dead.
2. Cross-file duplicate scan: exported and non-exported function names defined in more than
   one file were collected and their bodies compared by hand.
3. Import-graph checks: unused-export candidates were vetted through repo-wide searches
   (including HTML `<script>` blocks, e2e specs and docs), not just by import statements.
4. CSS scan: selectors were extracted from every stylesheet under `src/assets/css` and
   grouped by file to find cross-file duplication.
5. ESLint (`npx eslint .`) and token lint (`npm run lint:tokens`) were run. Token lint
   passes; there are no raw colour literals outside `tokens.css` and `reader-themes.css`.
6. Config audit: Prettier resolution was verified with
   `npx prettier --find-config-path src/utils/index.ts`; Firebase deploy wiring was checked
   against `firebase.json`; file copies were compared by hash (MD5 used only as a local
   equality check).

Limitations: dead-code detection is occurrence-based and cannot see runtime string
references. The CSS scan is heuristic (keyframe stops such as `from` / `to` / `0%` are
excluded from the meaningful totals). Findings below were individually verified before
being listed.

## Summary

| Id  | Finding                                                                                                                       | Severity |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| F1  | Emulator-tested `firestore/firestore.rules` differs from the deployed root `firestore.rules`                                  | High     |
| F2  | `firestore/firestore.indexes.json` is a byte-identical, unreferenced copy of the root file                                    | Medium   |
| F3  | Reader cloud-prefs save path (`saveReaderPrefs`) is never called while the load path is active                                | High     |
| F4  | Six exported symbols are dead across the entire repo                                                                          | Medium   |
| F5  | Comment helpers duplicated between the tale page and the reader page                                                          | Medium   |
| F6  | `prettier.config.js` is shadowed by `.prettierrc` and therefore dead config                                                   | Medium   |
| F7  | `src/ui/components/icons.js` is a one-line re-export shim every consumer imports through                                      | Medium   |
| F8  | `src/assets/images/auth/*` and `src/assets/images/logo.png` are unreferenced duplicates of `public/` files                    | Medium   |
| F9  | Duplicated CSS rules and conflicting cross-file overrides                                                                     | Medium   |
| F10 | `docs/MIGRATION_PLAN.md` describes changes (rules move, icons shim deletion, folder renames) that are not present in the code | Medium   |
| F11 | Dead local assignments in `src/pages/tale/inquire.js`; 34 further lint warnings live in test files                            | Low      |
| F12 | `_badge()` helper is byte-identical in two modules                                                                            | Low      |
| F13 | `escapeHtml` and `escapeText` are two public utilities doing the same job                                                     | Low      |
| F14 | Page-local `:root` token blocks bypass the documented token layers                                                            | Low      |
| F15 | `jsconfig.json` mirrors `tsconfig.json` alias paths (deliberate, but a documented drift hazard)                               | Low      |
| F16 | Two seeding scripts overlap (`scripts/seed-tales.mjs` is referenced nowhere; root `seed-tale.js` is gitignored)               | Low      |
| F17 | Test files repeat the same `vi.mock` calls (46x `@/utils`, 24x `@fb/index.js`, ...)                                           | Low      |

## F1. Firestore rules divergence (High)

The codebase contains two rules files that are not the same:

- Deployed rules: `firestore.rules` (repo root), wired in `firebase.json:5`.
- Tested rules: `firestore/firestore.rules`, read by
  `firestore/tests/rules.emulator.test.ts:36`, executed by the `rules-tests` job in
  `.github/workflows/ci.yml` via `npm run test:rules`.

The `/inquiries/{inquiryId}` block diverges:

- `firestore.rules:774-776` (deployed):
  `allow update: if isAdmin() || (isAuthenticated() && resource.data.authorId == request.auth.uid);`
  `allow delete: if isAdmin();`
- `firestore/firestore.rules` (tested): `allow update, delete: if isAdmin();`

Consequence: the emulator tests validate an older, stricter rules file than the one that
deploys, so the author-update allowance in production is untested, and any rules test result
does not describe the deployed system. The rules-tests CI job gives false confidence.

Recommended action: make the emulator tests read the deployed file (point
`rules.emulator.test.ts` at `firestore.rules`) or make `firebase.json` point at
`firestore/firestore.rules`, then delete the losing copy. Add the `inquiries` author-update
case to the test suite.

## F2. Duplicate indexes file (Medium)

`firestore.indexes.json` and `firestore/firestore.indexes.json` are byte-identical
(MD5 `42C64D29B22E87E2C3D55C38CEA5CD90`). Only the root copy is referenced
(`firebase.json:6`); nothing reads the `firestore/` copy. Delete the unreferenced copy once
F1 is resolved.

## F3. Reader cloud preferences are loaded but never saved (High)

`src/pages/reader/reader.js` contains both halves of a reader-preference cloud sync:

- Load: `_loadAndApplyCloudPrefs()` at line 1347, called at line 1408 on auth. Active.
- Save: `saveReaderPrefs(userId)` at line 1366, writing to `refs.readerPrefs(userId)`
  (line 1369). Never called from anywhere in the repository.

A repo-wide search for writes to `refs.readerPrefs` finds only this dead function
(all other `setDoc` call sites write drafts, progress, bookmarks, follows, likes or the
user profile). Net effect: when a reader changes theme, font, size, line-height or measure,
the change persists to localStorage only; the Firestore copy is never updated, and
`_loadAndApplyCloudPrefs` will keep applying stale cloud values on other devices.

Recommended action: decide the intended behaviour, then either wire `saveReaderPrefs` into
the theme/typography change handlers (see `src/pages/reader/theme.js`) or remove the load
path and the function together. Do not delete one half only.

## F4. Dead exports (Medium)

Six exported symbols occur exactly once in the entire repository, at their definitions:

| Symbol                | File:line                                          | Note                                                                                                                                                                                      |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saveReaderPrefs`     | `src/pages/reader/reader.js:1366`                  | See F3; not merely dead                                                                                                                                                                   |
| `appendTaleCards`     | `src/ui/components/taleCard.js:160`                | Docstring claims it serves the library "Load More" flow; the library only calls `renderCardsGrid` (`src/pages/library/filters.js:78-80`), so the flow it was written for no longer exists |
| `addReadTime`         | `src/services/reader/localProgress.service.js:208` | Companion of `MIN_READ_SESSION_MS`; read-time session recording is no longer wired                                                                                                        |
| `MIN_READ_SESSION_MS` | `src/config/app.config.js:41`                      | Same feature remnant as `addReadTime`                                                                                                                                                     |
| `APP_NAME`            | `src/config/app.config.js:19`                      | Comment says "used in page titles and UI labels"; nothing imports it                                                                                                                      |
| `URL_REGEX`           | `src/utils/validation.utils.ts:7`                  | No consumer; URL validation is handled by zod `.url()` in the same module                                                                                                                 |

Recommended action: remove `appendTaleCards`, `addReadTime`, `MIN_READ_SESSION_MS`,
`APP_NAME` and `URL_REGEX`; handle `saveReaderPrefs` per F3. Tests are unaffected (none of
the six is referenced by any test).

## F5. Duplicated comment helpers (Medium)

The tale page and the reader page each carry their own copy of the comment reply helpers:

- `formatCommentDateTime`: `src/pages/tale/comments.js:647` and
  `src/pages/reader/templates.js:346`. The tale version additionally unwraps Firestore
  `{ seconds }` timestamps; the reader version does not.
- `buildReplyTree`: `src/pages/tale/comments.js:832` and `src/pages/reader/templates.js:368`.
  Logic is identical.
- `_renderReplyNode`: `src/pages/tale/comments.js` and `src/pages/reader/templates.js`.
  Near-duplicates that differ only in styling and field names.

The tale page even imports the helper from its own copy
(`src/pages/tale/inquire.js` imports `formatCommentDateTime` from `./comments.js`), so a fix
to one copy never reaches the other.

Recommended action: move `formatCommentDateTime` and `buildReplyTree` into a shared module
(for example `src/utils/comment.utils.js`), keep the Firestore-timestamp handling from the
tale version, and have both pages import from there. `_renderReplyNode` can follow once the
two comment UIs are unified.

## F6. Dead Prettier config (Medium)

Both `.prettierrc` and `prettier.config.js` exist. Prettier resolves configuration in a
fixed order and stops at the first match; `npx prettier --find-config-path src/utils/index.ts`
resolves to `.prettierrc`, so `prettier.config.js` is never read.

The two files agree on every meaningful option (`singleQuote`, `trailingComma`, `printWidth`,
`tabWidth`, `semi`, `bracketSpacing`, `endOfLine`); `prettier.config.js` adds
`arrowParens: 'always'`, which is already the Prettier default. It is dead config that
invites someone to edit it and see no effect.

Recommended action: delete `prettier.config.js`.

## F7. Icons re-export shim (Medium)

`src/ui/components/icons.js` is a single line:
`export { initIcons } from '@/ui/icons.js';`

The real 304-line implementation is `src/ui/icons.js` (its only export is `initIcons`,
line 289). Current usage:

- 26 production imports of the shim path,
- 4 production re-exports (`export { initIcons } from '@ui/components/icons.js'` in page
  index files such as `src/pages/reader/index.js:26`),
- 20 test files that mock the shim path with `vi.mock('@ui/components/icons.js', ...)`.

`docs/MIGRATION_PLAN.md:60-62` claims this exact shim "was deleted; everyone now imports
the real file directly" - it was not, and nobody does. Either finish that change (update
all 50 call sites, including mocks) or delete the claim from the migration plan; keeping
both paths is the source of the confusion.

Recommended action: prefer finishing the migration (single canonical path), but the
cheapest consistent option is to keep the shim, update `MIGRATION_PLAN.md`, and stop
presenting it as removed.

## F8. Duplicate unreferenced image assets (Medium)

Byte-identical copies exist under both `public/` (served) and `src/assets/images/`
(unreferenced):

| File                                           | Relationship                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/assets/images/auth/boy-reading.svg`       | Identical to `public/images/auth/boy-reading.svg`; no code references the `src/` copy |
| `src/assets/images/auth/boy-reading-light.svg` | Identical to the `public/` copy; unreferenced                                         |
| `src/assets/images/logo.png`                   | Identical to `public/logo.png`; unreferenced                                          |

Consumers use the public paths (`/images/auth/...` in
`src/pages/login/login.js:374-375` and `src/views/login.html:209-214`, `/logo.png` in
`nav.templates.js:431` and the view headers). The `src/pages/home/reliquary.data.js:9-20`
imports of `@/assets/images/reliquary/*` are real and should stay.

Recommended action: delete the three unreferenced files under `src/assets/images/`.
Note: the reading-scene login work that was removed from the working tree referenced these
assets; if that work returns, decide on one canonical location instead of restoring copies.

## F9. CSS duplication and collisions (Medium)

The token lint passes, so colour handling is clean. The remaining duplication is structural.

True duplicated rule sets:

- `.modal-overlay`: `src/assets/css/components.css:1128` and
  `src/assets/css/pages/library.css:258`. Nearly identical (the library copy replaces
  `padding: var(--space-4)` with the literal `16px`).
- The comment surface is styled twice: `src/assets/css/pages/reader.css` and
  `src/assets/css/pages/tale.css` both define `.comment-textarea` (reader.css:1194,
  tale.css:300), plus `.comment-action-btn`, `.comment-reply-card`, `.comment-replies-list`,
  `.comment-inline-form`, `.comment-cancel-btn`, `.reply-target-tag` and their hover and
  nested variants - the CSS counterpart of F5.

Conflicting or superseded duplicates:

- `.theme-btn`: `components.css:436` is superseded by `reader.css:1022` on the reader page
  (both stylesheets load there; reader.css comes later). The only consumer of the class is
  the reader theme panel (`src/pages/reader/templates.js:202`). The components.css block
  contributes leftover properties and should be removed after a visual check.
- `.btn-ghost`: `components.css:162` vs `profile.css:981` (divergent backgrounds, border
  and colour). `.input-mythic`: `components.css:329` vs `profile.css:998` (divergent).
- `.stat-value`: `profile.css:1226` sets only `color: var(--text-primary)`, the exact value
  already set by `components.css:411` - a no-op override.

Class-name collisions between pages (same selector, unrelated components):

- `.era-pill`: `contribution.css:588` (pill-shaped, radius 9999px) vs `toc.css:73`
  (rectangular, `--radius-sm`).
- `.shelf-card`: `contribution.css:43` (glass editor panel) vs `shelf.css:12` (the actual
  shelf card, consumed by `src/pages/shelf/ui.js:159` and `contribution.html:605` onwards).
- `.chapter-item`: `contribution.css` vs `tale.css`.

Selector total: 40 selectors are defined in more than one stylesheet (keyframe stops
excluded); some are intentional per-page variants (see "Verified not redundant"), but the
list in the appendix is a good starting point for consolidation.

Recommended action: extract the comment styles into one shared component stylesheet; delete
the no-op `.stat-value` override; reconcile `.btn-ghost` / `.input-mythic`; remove the dead
`.theme-btn` block from components.css; rename the colliding classes (`.era-pill`,
`.shelf-card`, `.chapter-item`) to page-scoped names.

## F10. Stale migration plan (Medium)

`docs/MIGRATION_PLAN.md` describes a migration that the code does not reflect:

- Line 47-48: rules and indexes "Moved to `firestore/firestore.rules` + ..." - the deploy
  config still uses the root files (F1, F2).
- Line 60-62: the `ui/components/icons.js` shim "was deleted" - it exists and is imported
  50 times (F7).
- Line 64-70: "Phase 4 - `ui/` to `shared/`" and "Phase 5 - `pages/` to `features/`" -
  neither `shared/` nor `features/` exists; the plan reads as a record of completed work
  (past tense throughout) rather than an aspiration.

Because AGENTS.md directs agents to read repo documentation before acting, this file
actively misleads. Recommended action: either mark the document clearly as an unapplied
proposal, or update/remove the claims that contradict the code.

## F11. Lint warnings (Low)

`npx eslint .` reports 37 warnings and 0 errors. Production code contributes only two, both
in `src/pages/tale/inquire.js`:

- line 561: `inviteCard` is assigned and never used (`src/pages/tale/ui.js:237-239`
  contains the live implementation of the same toggle).
- line 729: `openTeaserBtn` is assigned and never used; the live code at line 778 uses
  `openTeaserBtns` instead.

The remaining 34 are unused imports, mock aliases and caught-error bindings in test files
(for example `src/pages/library/__tests__/filters.test.js` imports four `setup*` filter
functions it never calls, `src/pages/shelf/__tests__/ui.test.js` imports
`buildBookmarkCard`/`buildDraftCard`/`setGridEmpty`/`setGridError`, and several suites
import `vi` or `beforeEach` without using them). Also `src/test/setup.js:75` has an unused
`db` argument.

Recommended action: remove the two dead locals in `inquire.js`; clear test warnings
opportunistically when touching those files.

## F12. Identical `_badge` helper (Low)

`function _badge(text, classes = '')` is byte-identical in `src/pages/shelf/ui.js:13` and
`src/ui/components/taleCard.js:25`. Move it to a shared UI helper if either file is touched;
otherwise it is harmless.

## F13. Two escape utilities (Low)

- `escapeHtml` in `src/utils/string.utils.ts:17` (manual `replaceAll` chain).
- `escapeText` in `src/utils/sanitize.utils.ts:61` (DOM-based).

Both are exported from the `@/utils` barrel and used interchangeably; the reader grows its
own alias to paper over the difference (`src/pages/reader/templates.js:5` imports
`escapeText as escapeHtml`). They differ subtly: `escapeText` escapes via
`textContent`/`innerHTML`, while `escapeHtml` performs an explicit five-character
replacement. Consolidate to one and update the alias.

## F14. Page-local `:root` blocks (Low)

`contribution.css:6`, `library.css:6`, `profile.css:9` and `tale.css:6` declare page-layout
variables (`--editor-header-height`, `--sidebar-width`, `--left-panel-width`,
`--action-bar-height`) in `:root`. `tokens.css` documents a three-layer token system where
component tokens live in layer 3 of the token file. These blocks are not harmful but
bypass the documented layering and make grepping for token definitions unreliable.

## F15. jsconfig/tsconfig mirror (Low)

`jsconfig.json` duplicates the alias map from `tsconfig.json` (which already has
`allowJs: true`). `docs/MIGRATION_PLAN.md:66-69` documents this as intentional but also
records that `jsconfig.json` was missed during an alias update - a demonstrated drift
hazard. Keep only if an editor actually needs it; otherwise delete.

## F16. Seed script overlap (Low)

- `scripts/seed-tales.mjs` is referenced by nothing (not in `package.json`, not in docs).
- Root `seed-tale.js` is a second, older seeder that is explicitly gitignored
  (`.gitignore:68`).

Consolidate onto one tracked seeder and document how to run it, or delete the unreferenced
one.

## F17. Repeated test mocks (Low)

`vi.mock` declarations repeat the same module targets across suites: `@/utils` 46 times,
`@fb/index.js` 24, `@ui/components/icons.js` 20, `@ui/components/toast.js` 15,
`@services/index.js` 14. Vitest mocks are file-scoped by design, so this may be a
deliberate trade-off; if not, factory helpers in `src/test/mocks/` would remove several
hundred lines. Do not change blindly - mock isolation is deliberate in some suites.

## Verified not redundant (do not "clean up")

- `getOverallProgress` exists twice - `src/utils/progress.utils.ts:43` and
  `src/services/reader/localProgress.service.js:142` - but the implementations are
  different: the utils version consumes Firestore-style chapter-document maps
  (`{ "0": { scrollPercent } }`, returns `{ totalChapters, percent }`), the service version
  consumes localStorage status maps (`{ status: 'finished' }`, returns
  `{ percent, finishedChapters }`). Keep both.
- `progress.utils.service.js`, `localProgress.service.js`, `cloudProgress.service.js` and
  `resume.service.js` serve distinct storage tiers; no overlap found.
- The per-page `.atmosphere-base` overrides (`base.css:408`, `login.css:225`,
  `profile.css:36`, `shelf.css:104`) are intentional variants (different z-index and
  gradients per page), not duplicates.
- `public/images/placeholders/*` are used (`contribution.html:627,661,669`).
- `@/assets/images/reliquary/*` are used (`reliquary.data.js:9-20`).
- `firebase.json` and `vercel.json` are dual deploy targets kept manually in sync; both are
  live. Treat the rewrite lists as a paired-maintenance item, not duplication to delete.
- `functions/` is intentionally built and typechecked but not deployed (Spark plan); see
  `functions/README.md` and the CI/deploy workflow comments. Not dead code.

## Suggested cleanup order

1. F1/F2: single source of truth for Firestore rules and indexes; restore meaningful rules
   testing.
2. F3: decide the fate of reader cloud prefs (wire the save or remove the load).
3. F4: delete the five plainly dead exports.
4. F5/F9: consolidate the comment helpers and the comment stylesheet together (one change,
   two layers).
5. F6/F8: trivial deletions (`prettier.config.js`, three unreferenced image copies).
6. F7/F10: pick one icons import path and correct `MIGRATION_PLAN.md` so docs match code.
7. F11-F17: opportunistic cleanups when those files are next touched.

## Verification steps for any cleanup

Run before and after each change:

```
npm run lint
npm run lint:tokens
npm run type-check
npm test
npm run test:rules   # after any firestore/ change
```

For F9, verify visually in a browser at both `data-app-theme` values on the tale and reader
pages; CSS cascade changes are not covered by tests.

## Appendix: cross-file selector list

Selectors defined in more than one stylesheet under `src/assets/css` (keyframe stops
excluded; the full raw scan additionally matched `from`, `to`, `0%`, `50%`, `100%`):

`.atmosphere-base`, `.particle-field`, `.modal-overlay`, `.modal-overlay.hidden`,
`.modal-overlay:not(.hidden)`, `body`, `.ambient-orb`, `.comment-replies-list`,
`.comment-replies-list .comment-replies-list`, `.comment-cancel-btn`,
`.comment-cancel-btn:hover`, `.reply-target-tag`, `.comment-inline-form`,
`.comment-action-btn`, `.comment-action-btn:hover`, `.comment-textarea`,
`.comment-textarea::placeholder`, `.comment-reply-card`, `.stat-value`, `.btn-ghost`,
`.input-mythic`, `.input-mythic::placeholder`, `.progress-bar`, `.era-pill`,
`.era-pill:hover`, `[data-app-theme='light'] .era-pill`,
`[data-app-theme='light'] .era-pill:hover`, `.skeleton`, `.chapter-item`,
`.chapter-item:hover`, `.theme-btn`, `.theme-btn:hover`, `.options-menu`, `.shelf-card`,
`#mobile-dock-container`, `*::after`, `.hover-lift`, `.hover-lift:hover`,
`[data-app-theme='light'] .glass-card-strong`, `:root`.

---

## Resolution (2026-10-18, same-session follow-up)

Implemented on branch `feat/comprehensive-improvements` (not merged). What each finding got:

- **F1 — fixed.** Root `firestore.rules` confirmed as canonical; `firestore/tests/rules.emulator.test.ts`
  repointed to it; the inquiries author-update rule added (matching the live `inquire.js` flows);
  four new emulator tests cover it. Stale `firestore/firestore.rules` deleted.
  `npm run test:rules`: 17/17 pass.
- **F2 — fixed.** `firestore/firestore.indexes.json` deleted (byte-identical duplicate of the root file).
- **F3 — fixed.** Cloud prefs persistence wired into `src/pages/reader/theme.js`: debounced
  (600ms) per-user save; pref setters take `persist = true` so init/cloud-apply passes `false`
  and never echoes a write back to the server. Dead `saveReaderPrefs` removed. Covered by new
  fake-timer tests in `theme.test.js`.
- **F4 — fixed.** Deleted all five dead exports: `appendTaleCards`, `addReadTime`,
  `MIN_READ_SESSION_MS`, `APP_NAME`, `URL_REGEX`.
- **F5 — fixed.** Shared helpers extracted to `src/utils/comment.utils.ts`
  (`formatCommentDateTime`, `buildReplyTree`). Deliberately _not_ added to the `@/utils` barrel:
  dozens of suites `vi.mock('@/utils')` wholesale, so barrel additions surface as `undefined`
  in those tests — pages import the module path directly, which the extraction documents in a
  header comment. Covered by a dedicated `src/utils/__tests__/comment.utils.test.js` (including
  the Firestore `{ seconds }` shape and the orphan-reply case); the helper tests that had been
  copied into both page suites were removed from them.
- **F6 — fixed.** `prettier.config.js` deleted (shadowed by `.prettierrc`).
- **F7 — fixed.** All consumers migrated to `@ui/icons.js` (including two relative `./icons.js`
  imports inside `src/ui/components/` that the bulk grep initially missed and only the full test
  run caught); the shim `src/ui/components/icons.js` deleted.
- **F8 — fixed.** Three unreferenced images deleted (`auth/boy-reading.svg`,
  `auth/boy-reading-light.svg`, `logo.png`).
- **F9 — fixed, except the visual-QA item.** Deleted the no-op `.stat-value` override
  (profile.css), the duplicated `.modal-overlay` (library.css; `--space-4` verified = 16px), and
  the dead `.theme-btn` section (components.css; the reader stylesheet is the only consumer and
  is self-sufficient). Renamed the contribution-page collisions so every name has one owner:
  `.era-pill` → `.era-chip` (incl. the `data-era-pill` attribute/dataset accessor),
  `.shelf-card` → `.atelier-card`, `.chapter-item*` → `.chapter-row*` (CSS, HTML, JS and tests).
  Hoisted the genuinely identical comment-thread rules into a shared section of
  `components.css` (`.reply-target-tag`, `.comment-replies-list` geometry incl. both
  breakpoints). Token-dependent comment styling intentionally stays page-local (reader theme
  variables vs app tokens — unifying them changes real colours on four reader themes), and the
  profile `.btn-ghost`/`.input-mythic` overrides kept their behaviour: the provably-dead hover
  declarations were dropped and the remaining shadowing is now explicitly documented in
  comments. **Remaining:** a full comment-surface parameterization and a `.btn-ghost`/`.input-mythic`
  value unification are visual changes that need a browser pass at both `data-app-theme` values
  on the tale and reader pages — deliberately not performed blind.
- **F10 — fixed.** `docs/MIGRATION_PLAN.md` gained a scope banner ("sandbox vs this repo") and
  the specific false claims corrected inline: rules/indexes location, the icons shim, the
  `shared/`/`features/` phases (marked sandbox-only), the `AGENTS.md` removal, and the
  `jsconfig.json` mention.
- **F11 — fixed.** ESLint now reports 0 problems: the two dead locals in `inquire.js` plus
  unused imports/aliases/error bindings across test files, and `src/test/setup.js`'s unused
  `db` argument.
- **F12 — fixed.** Shared `renderBadge` in `src/ui/components/badge.js`; the byte-identical
  `_badge` helpers in `taleCard.js` and `shelf/ui.js` removed.
- **F13 — fixed.** Consolidated on `escapeHtml`; `escapeText` deleted from
  `sanitize.utils.ts`; the reader's `escapeText as escapeHtml` alias and the vestigial
  `escapeText` mock keys removed. (`docs/CONVENTIONS.md` updated accordingly.)
- **F14 — fixed.** The page-local `:root` blocks (contribution, library, profile, tale) moved
  into `tokens.css` section 8 as page-layout tokens, including the contribution mobile override.
- **F15 — fixed.** `jsconfig.json` deleted; `docs/CONVENTIONS.md`'s alias section now documents
  three config files and why the fourth is gone.
- **F16 — fixed.** Tracked seeder documented: `npm run seed:tales` added to `package.json`,
  README Development section updated. The gitignored root `seed-tale.js` was left untouched
  (untracked local scratch file).
- **F17 — intentionally not changed.** The report's own caution applies: `vi.mock` is
  file-scoped by design, several suites depend on that isolation, and no subset could be
  factored out without coupling test files to shared mutable mock factories. Revisit only
  alongside a test-infrastructure project, not as a drive-by cleanup.

Noted out of scope for this audit (new finding, no fix): `src/services/inquiry.service.js`'s
`reportInquiry`/`blockInquirySender`/`replyToInquiry` are referenced only by their own tests —
production paths use the versions in `src/pages/tale/inquire.js`. Candidate for a future
dead-code pass.

Verification run for this resolution: `npm run verify` green (format, lint, tokens, types;
103 unit test files, 854 tests passing) and `npm run test:rules` 17/17.
