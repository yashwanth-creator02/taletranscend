# 0002 — Firestore rules validate permission, not exhaustive field data

**Status:** Accepted
**Date:** during the repo restructuring (see `docs/MIGRATION_PLAN.md` Phase 2)

## Context

The first rewrite of `firestore.rules` (fixing ADR 0001's path mismatch) also fixed the
original audit's Critical Finding #2 (the reaction-count permission bug) by adding thorough,
individual field-level validation to every `create`/`update` rule — type-checking and
bounds-checking each of the ~20-28 fields on documents like `tales/{taleId}`, matching the
level of detail the rules already had before the rewrite.

Running the actual rules emulator test suite (`npm run test:rules`) against this surfaced a
real failure: `"Unable to evaluate the expression as the maximum of 1000 expressions to
evaluate has been reached."` — a hard Firestore platform limit on expressions evaluated per
request. Switching the presence-check pattern from `request.resource.data.keys().hasAny([field])`
to the cheaper `field in request.resource.data` reduced the cost meaningfully but the
full-document `update` rule for tales still hit the same wall.

## Decision

Stop validating every field individually in rules. Validate only fields with real security or
cross-rule logic consequences — ownership fields, enum-like fields other rules branch on
(`status`, `visibility`), numeric counters that a _different_ user is allowed to touch via a
field-scoped exception, and timestamps `respectsCooldown()` depends on. Replace the removed
per-field bound checks with a single `request.resource.data.size() <= N` blanket guard against
a document being padded with excessive junk fields.

This is also just correct per Firestore's own guidance: rules exist to answer "is this user
allowed to make this write," not "is every field shaped exactly right" — the latter is the
client's job today, and could be a Cloud Function's job later, but duplicating it in rules
isn't free, and past a certain document size it's not even possible within the platform's
budget.

## Consequences

- A malicious _author_ of their own tale/draft/profile can now write malformed values into
  fields like `synopsis`, `era`, `tone`, etc. — but since only the owner (or admin) can write
  those documents at all, this only lets someone corrupt their own data, not attack another
  user. Accepted as a non-issue for the fields where this applies.
- Fields genuinely worth protecting regardless of the 1000-expression concern (identity fields
  in `comments/` specifically, since that's the one place a _non-owner_ writes into another
  user's space) kept their full validation — this decision is about the majority pattern, not
  every rule uniformly losing validation.
- If Firestore's per-request expression budget increases in the future, or if genuinely strict
  server-side field validation becomes a real product requirement, that's a `functions/`
  Cloud Function's job (e.g. an `onDocumentWritten` trigger that validates and reverts/flags a
  bad write), not something to push back into rules — rules should stay lean going forward, not
  slowly re-accumulate the same class of bug this decision fixed.
