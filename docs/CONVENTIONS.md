# TaleTranscend — Conventions

Patterns this codebase follows, most of them established (or hardened) during the
`docs/MIGRATION_PLAN.md` restructuring. Written down so they don't have to be rediscovered —
several of these were learned the hard way, by hitting the exact bug the convention now
prevents. Where that's true, it's noted, since the "why" matters more than the rule itself.

---

## File suffixes mean something

| Suffix         | Meaning                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `*.service.js` | Business logic / data access. Talks to Firestore, external APIs, or localStorage. Never touches the DOM directly.                                      |
| `*.schema.js`  | Canonical shape + factory for a data type (`createTale()`, `createUser()`, etc.) — the single source of truth for "what fields does a Tale have."      |
| `*.utils.ts`   | Pure(ish) utility functions. TypeScript, not JS — this is the one place strict typing is enforced today.                                               |
| `*.storage.js` | Browser-storage-backed persistence (localStorage/sessionStorage), as opposed to `*.service.js` which usually means Firestore. See `apiKey.storage.js`. |
| `*.config.js`  | Static configuration/constants, no logic.                                                                                                              |

Don't invent a new suffix without a reason — the point is that the suffix alone tells you what
a file does before you open it.

## One folder per domain — no flat exceptions

`src/services/`, `src/shared/components/`, and `functions/src/` (triggers/callable/admin) all
follow the same rule: every domain/component gets its own folder, even if it's currently just
one file. A flat file sitting next to folder-based siblings is a strong signal something's
inconsistent — either the flat file needs its own folder, or (if it's small and clearly related
to an existing domain, like `markFinish.service.js` joining `services/reader/`) it belongs
inside an existing one. Don't create a folder for exactly one file with no sibling in sight —
that's indirection without payoff.

## Path aliases exist in **four** separate config files — update all four or nothing works

`vite.config.js`, `tsconfig.json`, `vitest.config.js`, and `jsconfig.json` each define the same
alias list independently. There's no single source of truth for them at the tooling level.
This bit us twice during the migration — an alias rename applied to three of the four files,
with `jsconfig.json` silently left stale each time, only caught later by a repo-wide grep.
**Whenever you add, rename, or remove a path alias, grep the whole repo for the old alias
string afterward** (`grep -rn "@oldname" .`) rather than trusting that you remembered every
config file.

## Escaping discipline: every innerHTML assignment goes through the sanitize layer

Any HTML string built from data that came from Firestore, user input, or anywhere outside this
codebase's own literal strings must go through `escapeHtml()`/`escapeText()` (for plain text)
or `sanitizeHtml()` (for the few places actual HTML formatting is intentional, like chapter
content) before it's assigned to `innerHTML` or interpolated into a template string that becomes
`innerHTML`. This was a genuine strength found in the original repo audit — keep it that way.
When adding a new component that renders anything from a Firestore document, check: does this
field's value ever get set by a user (directly or indirectly)? If yes, escape it.

## Firestore rules: check WHO can write, not exhaustively WHAT they write

Rules should verify permission (ownership, role, identity), not duplicate full field-level data
validation the client (or eventually a Cloud Function) already does. This isn't a style
preference — Firestore enforces a hard 1000-expression-per-request evaluation budget, and
exhaustive per-field validation on a document with more than ~20 fields will eventually blow
it (this happened for real during the migration — see
`docs/decisions/0002-lean-firestore-rules-validation.md`). Concretely:

- Validate fields that have real security/logic consequences elsewhere in the rules (ownership
  fields, enum-like fields other rules branch on, numeric counters, timestamps used by
  `respectsCooldown()`).
- For everything else, a single `request.resource.data.size() <= N` blanket check is a
  reasonable, cheap guard against a document being padded with junk — don't reach for 15
  individual field checks when one size check covers the actual risk.
- Use `field in request.resource.data` for presence checks, not
  `request.resource.data.keys().hasAny([field])` — the latter materializes the entire key list
  on every call; with a field validated 20+ times in one rule, that's 20+ full re-scans of the
  same list. `in` is a single direct lookup.
- Any field accessed via dot notation (`request.resource.data.foo`) that isn't already guarded
  by an earlier `isValidX()` call in the same `&&` chain needs an explicit `'foo' in
request.resource.data &&` guard first, or a missing field throws an evaluation error instead
  of just failing the condition.

## The "who actually writes this document" question, for every new subcollection

Before writing a rule for a new collection, ask: is the writer always the document owner (the
`{uid}` in the path), or could someone else legitimately write here? Most subcollections under
`users/{userId}/...` are owner-only. A few aren't — `followers/{followerUid}` is the clearest
example: the _follower_, not the profile owner, creates that document. Using `isOwner(userId)`
there instead of `isOwner(followerUid)` would silently block the exact write the feature needs,
the same bug class as the original reaction-count permission issue. When a feature involves one
user acting on another user's data, work out which side does the writing before writing the rule.

## Engagement counters: field-scoped rule exceptions, not full-document permission

Fields like `reactionCount`/`commentCount`/`bookmarkCount` on a tale document need to be
writable by users who aren't the tale's author. Don't solve this by loosening the whole
document's update permission — scope it to exactly those fields:

```
isAuthenticated()
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactionCount', ...])
  && isValidNumber('reactionCount', 0, 1000000000)
```

This project's Cloud Functions (`onReactionWrite`, `onCommentWrite`) are the "proper" long-term
owner of these counters, but they're currently dormant (Spark plan — see
`functions/README.md`), so the field-scoped rule exception is the actual, permanent mechanism
in production today, not a stopgap. Don't treat it as temporary scaffolding to be removed later
without confirming the functions are actually deployed and working first.

## BYOK for anything needing a paid third-party API key

This project stays on Firebase's free Spark plan by choice, which rules out Cloud
Functions entirely (any kind — triggers, callable, HTTP — all require Blaze). For AI features,
that means no server-side proxy holding a shared API key. The pattern instead: each user
supplies their own key, stored client-side only (`localStorage`, via a dedicated `*.storage.js`
module), with a modal prompting for it on first use. See `src/services/ai/apiKey.storage.js`
and `src/shared/components/apiKeyModal/`. If a future feature needs a paid third-party API,
default to this pattern rather than reaching for a Cloud Function — it's the one that actually
fits this project's hosting constraints.

## A service reaching into a UI component is allowed, but only via dynamic import

`resonance.service.js` and `ai.service.js` both call into UI components (`showToast`,
`ensureApiKey`) directly from a service file, which normally isn't tortured architecture:
services usually shouldn't know about the DOM. It's accepted here specifically because it's
the one way for a low-level async operation to prompt the user for something it needs
mid-flow (a toast, a missing API key) without every single caller having to remember to check
first. Keep this pattern's usage narrow and always use a dynamic `import()`, not a static
top-level one — that keeps the service's own module graph free of UI dependencies for every
code path that doesn't actually need them.

## Test conventions

- Tests live in a colocated `__tests__/` folder next to the code they test, not centralized.
- The global mock in `src/test/setup.js` (`vi.mock('@fb/index.js', ...)`) must include every
  export any service module reads **at module load time**, not just what's used inside a
  function body — `ai.service.js`'s old Cloud-Function version called `httpsCallable()` at the
  top of the file, and the global mock not accounting for that broke most of the test suite at
  once. When adding a new top-level call to an `@fb/index.js` export, check the global mock
  covers it before assuming a test failure is unrelated.
- Retry/backoff logic gets tested with `vi.useFakeTimers()` + `vi.runAllTimersAsync()`, never
  real timers. A real-timer retry test in this codebase once took 14+ seconds by itself — there
  is no good reason for a unit test to take that long.
- When a Firestore rules change is made, run `npm run test:rules` against the real emulator
  before considering the change done. Static review of rules syntax is not a substitute — this
  project hit three separate real bugs (a Firestore evaluation-budget limit, an invalid
  `duration.value()` unit string, and unguarded field access throwing instead of failing
  closed) that only surfaced by actually running the emulator tests, not by reading the rules
  file carefully.

## Model/API version pinning will go stale — plan for it, don't just fix it once

`GEMINI_MODEL` in `ai.service.js` is a pinned model string, and Google retires model versions
on the order of months. This project hit that in production once already (`gemini-2.0-flash`
was retired; every call started returning 404, indistinguishable from a missing-key error until
the error handling was fixed to log it distinctly). Don't switch to a `-latest`-style alias to
dodge this — those get silently hot-swapped and can 404 too, just less predictably. Instead:
keep the model name a single, easy-to-update constant (already true), and make sure whatever
error handling wraps the call surfaces a **distinct, specific** failure for "this identifier
doesn't exist anymore" separate from auth/rate-limit failures, so the next time this happens
it's a one-line fix instead of a debugging session.
