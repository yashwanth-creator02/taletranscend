# TaleTranscend — Repo Structure Migration Plan

**Status key:** ✅ Done · ⬜ Not started · 🚫 Voided

Started from the findings in the original repo audit. Goal: move to a feature-based structure,
close the security/data-integrity gaps the audit found, and set up the infrastructure (CI,
docs) to keep new gaps like that from going unnoticed as long. See `docs/CONVENTIONS.md` for
the patterns this work established, and `docs/decisions/` for the reasoning behind the choices
that weren't obvious in the moment.

This file was regenerated after the fact from the real history of the work — some of it
happened across a long back-and-forth with real debugging, real mistakes, and real fixes, not
a clean linear plan executed exactly as written. Where that's relevant, it's noted.

---

## Phase 1 — Flatten Firestore data paths 🚫 VOIDED

Originally planned to remove the `v1/taletranscend/projects/v1` prefix from
`src/firebase/paths.js`, matching the flat root-level collections `firestore.rules` used at the
time. Fully built, tested, and packaged — then explicitly reversed by project decision before
being applied to the real repo. See `docs/decisions/0001-keep-nested-firestore-path.md`.

## Phase 2 — Firestore rules ✅

- Rules restructured to match the app's actual nested paths (the reverse of Phase 1 — rules
  changed to match `paths.js`, not the other way around)
- **Critical Finding #2 fixed:** `reactionCount` now has a field-scoped update exception
  allowing any authenticated user to react to someone else's tale — see
  `docs/decisions/0004-field-scoped-rule-exception-for-engagement-counters.md`
- The `progress`/`readerProgress` collection rule rewritten to match the actual subcollection-
  based write shape `cloudProgress.service.js` uses, instead of an inline-map shape nothing
  ever wrote
- Rules added for every previously-uncovered collection (`preferences`, `lists`,
  `readingHistory`, `following`/`followers`, `notifications`, `achievements`,
  `comments/{id}/likes`, `tales/{id}/versions`, `tags`, `meta/*`)
- **Three real bugs found only by running `npm run test:rules` against the actual emulator, not
  by review:**
  1. Exhaustive per-field validation hit Firestore's 1000-expression-per-request budget — see
     `docs/decisions/0002-lean-firestore-rules-validation.md`
  2. `duration.value(5, "seconds")` was invalid (the unit must be `"s"`, not the word)
  3. Several places accessed a field directly without a presence guard first, throwing an
     evaluation error instead of failing closed, on more than one occasion — this pattern
     (`'field' in request.resource.data &&` before any dot-notation access) is now the standing
     convention, see `docs/CONVENTIONS.md`
  4. `rules_version = '3'` doesn't exist (only `'2'` does) — caught independently
- Moved to `firestore/firestore.rules` + `firestore/firestore.indexes.json` +
  `firestore/tests/rules.emulator.test.ts` (previously all at repo root)
- `vitest.rules.config.js` added — a separate Vitest config (Node environment) for the rules
  emulator tests, since they can't share a config with the jsdom-environment app tests

## Phase 3 — Normalize `services/` ✅

One folder per domain. `markFinish.service.js`/`progress.utils.service.js` joined the existing
`reader/` domain rather than each getting a single-file folder of their own — a folder with one
file isn't really a domain.

## Phase 4 — `ui/` → `shared/` ✅

Components grouped one-per-folder under `shared/components/`. The old
`ui/components/icons.js` — a one-line re-export shim every consumer imported through instead of
the real file — was deleted; everyone now imports the real file directly.

## Phase 5 — `pages/` → `features/` ✅

Mechanical rename. Alias updated in all four places it's independently defined
(`vite.config.js`, `tsconfig.json`, `vitest.config.js`, `jsconfig.json` — see
`docs/CONVENTIONS.md`'s note on this; `jsconfig.json` was missed on the first pass here and had
to be caught with a repo-wide grep afterward). HTML `<script src>` paths updated separately,
since those are relative paths resolved by Vite's HTML transform, not the JS-side alias config.

## Phase 6 — Cloud Functions, then BYOK ✅

The original plan (a `functions/` scaffold covering reaction/comment counters, an AI proxy, and
admin claims) was fully built — then partially superseded on discovering that Cloud Functions
of any kind require the Firebase Blaze plan, which this project stays off of by choice.

- `onReactionWrite`, `onCommentWrite`, `setModeratorClaim` remain in `functions/`, written and
  compiled, dormant until/unless this project ever moves to Blaze — see `functions/README.md`
- The AI proxy (`generateAiText`) was removed entirely and replaced with BYOK (each user's own
  API key, stored client-side) — see `docs/decisions/0003-byok-ai-instead-of-cloud-function-proxy.md`
- While consolidating AI code for the BYOK switch, found the "one dead AI feature" the original
  audit flagged (`profile/ai-name.js` reading `window.__GEMINI_KEY__`, never assigned anywhere)
  was actually one of **three** separate near-duplicate Gemini implementations in the codebase.
  Consolidated to one (`src/services/ai/ai.service.js`), fixing the dead feature for real in
  the process.
- **A real production bug, found after this phase shipped:** the hardcoded Gemini model,
  `gemini-2.0-flash`, was retired by Google. Every AI call started returning 404, which the
  error handling collapsed into the same generic "check your API key" message a genuinely
  missing key would produce — actively misleading about the real cause. Fixed by updating the
  model (`gemini-3.5-flash-lite`) and adding distinct 404 handling that logs plainly, so a
  future model retirement (which will happen again) is a fast fix instead of a debugging
  session. See `docs/CONVENTIONS.md`'s note on model pinning.
- Several rounds of real, concrete mistakes surfaced and fixed during this phase specifically —
  worth knowing this phase had the roughest history of any of them: a patch applied against a
  stale base reverted Phase 3's folder structure for several services; a duplicate flat
  `ai.service.js` (old Cloud-Function version) sat alongside the correct BYOK one; leftover
  `src/firebase/functions.js` (a Cloud Functions client wrapper, unnecessary under BYOK) got
  reintroduced; a duplicate JSON key in `firebase.json`; and the BYOK modal was initially built
  using the pre-Phase-4 `@ui` alias against a zip that didn't yet reflect the real repo's
  `@shared` structure. All found and fixed by actually running lint/typecheck/tests after each
  round, not by assuming a fix was correct.

## Phase 6.5 — Docs cleanup ✅

Removed `AGENTS.md` (duplicated `README.md`/`ARCHITECTURE.md` content in a condensed,
agent-tool-oriented format, and was concretely proven drift-prone — missed by two separate
phases' doc updates before being caught). Kept `CONTRIBUTING.md` (genuinely distinct content).
Added `functions/README.md` (deployment/secrets setup, specific to the new package, not
duplicated anywhere else).

## Phase 7 — CI/CD ✅

- `.github/workflows/ci.yml`: lint, typecheck, unit tests, `functions/`'s own typecheck, the
  Firestore rules emulator tests, and E2E — five independent jobs, aggregated into one
  `ci-required` status check for branch protection to point at
- `.github/workflows/deploy.yml`: Hosting + Firestore rules/indexes only, **not** `functions/`
  (Blaze requirement, same as everywhere else). Manual trigger (`workflow_dispatch`) rather
  than automatic on push, until deploy secrets are actually configured
- Two bugs caught by actually reading `playwright.config.js` instead of assuming standard
  E2E setup: an unnecessary build step (Playwright starts its own dev server via its `webServer`
  config) and only installing the Chromium browser when the config runs both Chromium and
  Firefox projects

## Phase 8 — Docs & conventions ✅

- `docs/CONVENTIONS.md` — the patterns above, written down
- `docs/decisions/` — ADRs for the four decisions in this project with real, non-obvious
  reasoning behind them (the path-nesting reversal, lean rules validation, BYOK, and the
  permanent-not-temporary field-scoped counter exception)
- This file, regenerated — it had existed only in the sandbox environment used across the
  migration work and was never actually part of the real repository until now

## Phase 9 — Split giant HTML view files ⬜

`contribution.html`/`profile.html` (~40KB each, from the original audit) still have significant
duplicated nav/layout markup across all 8 view files. Not started.

## Phase 10 — Import boundaries ⬜

`eslint-plugin-boundaries` (or similar) to enforce that `features/*` doesn't reach into another
feature's internals, only through `shared/` or `services/`. Not started.

## Also outstanding, not part of the original phase plan

- **"Liked tales" on the profile page** — reactions are stored per-tale
  (`tales/{taleId}/reactions/{uid}`), with no per-user reverse index yet. Agreed design: mirror
  into `users/{uid}/likedTales/{taleId}` on like/unlike, consistent with how bookmarks/drafts/
  reading history already work, rather than a Firestore collection-group query. Not built.
- **Comment edit/delete UI** — the rules and schema already support `isEdited`/`isHidden`
  fields, but there's no edit or delete button in the actual UI at all currently. Agreed design:
  soft-delete via a new `isDeleted` field (comment doc stays in place, preserving reply
  threads), UI shows "[deleted]"/"[edited]" placeholders. Not built.
