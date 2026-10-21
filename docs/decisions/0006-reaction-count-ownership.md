# 0006 — `reactionCount` is client-owned; `onReactionWrite` is a no-op

**Status:** Accepted
**Date:** 2026-10-19

## Context

`tales/{taleId}.reactionCount` had two independent writers:

1. `src/services/resonance.service.js` — `updateDoc(taleRef, { reactionCount: increment(±1) })`
   in the same user gesture that creates or deletes `tales/{taleId}/reactions/{uid}`.
2. `functions/src/triggers/onReactionWrite.ts` — an `onDocumentWritten` trigger on the
   `reactions/` subcollection that increments the same field from the event.

Neither guarded against the other. ADR 0004 already flagged this ("If
`onReactionWrite`/`onCommentWrite` are ever deployed, there is a real risk of double-counting"),
and `functions/README.md` carried it as a "Known landmine".

The conflict was latent rather than visible: Cloud Functions cannot be deployed on the Spark
plan, so only the client increment ever runs. The first Blaze deploy would have silently
doubled every resonance from that moment on, and the resulting numbers would look plausible
enough to be hard to diagnose.

## Decision

**The client owns `reactionCount`.** `src/services/resonance.service.js` stays the only writer.

`onReactionWrite` is now an **intentional no-op**. It is kept registered rather than deleted so
that the deploy surface is unchanged and so the rationale appears in `firebase deploy` output
next to the function it constrains.

`onCommentWrite` was **not** changed: the client never writes `commentCount`, so there is no
double-writer there.

The dual-writer hazard is removed at the source instead of being documented as a caveat, which
is what ADR 0004 had to settle for.

## Consequences

- Deploying `functions/` to Blaze can no longer double-count reactions. The reactive
  mitigation ADR 0004 asked for ("don't assume deploying the function alone is sufficient") is
  no longer needed for `reactionCount`.
- If reaction counting is ever moved server-side, the change is a single commit: restore the
  increment in `onReactionWrite.ts` and delete the `updateDoc` calls in `resonance.service.js`.
  Doing only one of those reintroduces the bug.
- `reactionCount` remains readable and correct on Spark, which is the only plan in use.
- The rule exception from ADR 0004 (any authenticated user may adjust
  `reactionCount`/`commentCount`/`bookmarkCount` within the validated range) is still in force
  and still carries its own acknowledged weakness — a user can set the field to an arbitrary
  in-range value rather than only ±1. That is unchanged by this decision and tracked in
  ADR 0004.
- `reactionCount` can still desync from the true `reactions/` subcollection count if a client
  write succeeds and the paired increment fails (or vice versa), because the two writes are not
  transactional. A reconciliation read of `count(reactions/)` is the remedy if that is ever
  observed.
