# 0004 — Engagement counters stay client-writable via a field-scoped rule, permanently

**Status:** Accepted
**Date:** during the repo restructuring (see `docs/MIGRATION_PLAN.md` Phase 2 and Phase 6)

## Context

`tales/{taleId}.reactionCount` needs to be incrementable by any authenticated user reacting to
someone else's tale — not just the tale's author. The original rules required
`isAuthor() || isAdmin()` for any update at all, so this was the exact bug behind the original
audit's Critical Finding #2: reacting to someone else's tale was rejected outright.

Two ways to let a non-author update just this one field: a field-scoped exception in the
Firestore rule itself (`diff().affectedKeys().hasOnly([...])`), or move the write server-side
into a Cloud Function (`onReactionWrite`) that owns the field entirely, with the client never
writing it directly.

The Cloud Function approach was built (see ADR 0003 for why Cloud Functions became a
complication) but can't currently be deployed — Spark plan doesn't support Cloud Functions of
any kind.

## Decision

The field-scoped rule exception is the actual, permanent production mechanism for
`reactionCount`/`commentCount`/`bookmarkCount`, not a temporary stopgap awaiting the "real" fix.
`onReactionWrite`/`onCommentWrite` exist in `functions/`, fully written and compiled, ready to
deploy the moment (if ever) this project moves to Blaze — but nothing about their existence
should be read as "this rule exception is provisional." Until they're actually deployed and
confirmed working, the rule is what's keeping these counters functional at all.

## Consequences

- Any authenticated user can currently set `reactionCount` to any value within the validated
  numeric range (0 to 1 billion) on any tale, not just increment/decrement by one — the rule
  validates the _field_ being touched and its type/bounds, not that the change is a delta of
  exactly ±1. A malicious user could set a tale's `reactionCount` to a large arbitrary number.
  Accepted for now: the blast radius is a cosmetic number on a single tale, not a security or
  data-integrity issue affecting other users' data. If this needs tightening later without
  Cloud Functions, a transaction-based client write comparing old/new values, or a rule using
  `resource.data.reactionCount` to bound the delta, are the places to start.
- If `onReactionWrite`/`onCommentWrite` are ever deployed, there is a real risk of double-
  counting if the field-scoped rule exception isn't removed at the same time (both the client's
  direct write and the function's trigger would increment the same field). Before deploying
  those functions, this rule exception needs to be revisited — don't assume deploying the
  function alone is sufficient.
