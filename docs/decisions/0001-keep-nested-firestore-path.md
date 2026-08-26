# 0001 — Keep the nested Firestore path prefix, don't flatten it

**Status:** Accepted
**Date:** during the repo restructuring (see `docs/MIGRATION_PLAN.md` Phase 1)

## Context

The original repo audit found that `firestore.rules` didn't match the actual paths the app
writes to: every collection lived under a `v1/taletranscend/projects/v1/` prefix (defined as
`APP_ROOT` in `src/firebase/paths.js`), but the rules file only defined root-level collections
(`/tales/{taleId}`, `/users/{userId}`, etc.), with a `deny all` fallback for anything else.
Every real read/write was silently falling through to that fallback.

Two ways to fix the mismatch: flatten `paths.js` to drop the prefix (matching the rules as
they were), or rewrite the rules to match the prefix that was already there.

## Decision

Keep the prefix. Rewrite the rules to match it, nested under one outer
`match /v1/taletranscend/projects/v1 { ... }` wrapper (see
`docs/decisions/0002-lean-firestore-rules-validation.md` for how the rules content itself
evolved after this).

This was actually attempted the other way first (flattening `paths.js`, removing the prefix
entirely) and fully built out, tested, and packaged as a migration phase — then explicitly
reversed by project decision before being applied to the real repo. That work is why this ADR
exists: to record that the reversal was deliberate, not an oversight, so nobody re-flattens the
paths later while trying to "clean up" what looks like unnecessary nesting.

## Consequences

- Firestore rules are structurally more verbose than they'd be with flat paths — every
  top-level collection sits one level deeper, inside the wrapper `match` block.
- The nesting itself (`v1/taletranscend/projects/v1`) reads like leftover scaffolding from a
  hypothetical multi-tenant/multi-version setup that was never built out. It probably is. That
  was true when this decision was made too — flattening it remains a reasonable thing to
  reconsider later, but it's an explicit choice to make deliberately, with full understanding
  that it requires touching `paths.js`, `refs.js`, and every rule in `firestore.rules`
  simultaneously — not a quick cleanup.
- Firestore rules language has no string-interpolated path constant (no `APP_ROOT` equivalent)
  — the one-outer-`match`-wrapper technique is the closest equivalent, and is now the
  established pattern for this file (see `docs/CONVENTIONS.md`).
