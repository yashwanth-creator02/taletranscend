# 0003 — AI features use BYOK (bring your own key), not a server-side proxy

**Status:** Accepted
**Date:** during the repo restructuring (see `docs/MIGRATION_PLAN.md` Phase 6 → 6.6)

## Context

The original audit flagged the client shipping a single shared Gemini API key
(`VITE_GEMINI_API_KEY`) baked into the JS bundle — extractable by anyone, billed to the project
owner. The first fix moved this key server-side into a Cloud Function (`generateAiText`)
holding it as a Firebase Functions secret, with the client calling the function via
`httpsCallable` instead of hitting Gemini directly.

That design was fully built, and only then discovered to require the Firebase Blaze
(pay-as-you-go) plan — not specific to secrets, but to Cloud Functions of any kind (triggers,
callables, everything). The project intentionally stays on the free Spark plan, which doesn't
support deploying any Cloud Function at all.

## Decision

Each user supplies their own Gemini API key (free tier available from Google AI Studio),
entered once via a modal and stored only in their own browser's `localStorage`
(`src/services/ai/apiKey.storage.js`). `ai.service.js` calls Gemini directly from the client
with that key — no server hop, no Cloud Function involved.

## Consequences

- No server-side piece is needed for AI features at all, which is what actually makes this
  compatible with staying on Spark indefinitely.
- Each user bears their own API cost and quota, not the project owner — appropriate for a
  free/hobby project, inappropriate if this project ever needs every user to get the same AI
  experience without setting anything up themselves. Revisit if that requirement ever emerges.
- The `generateAiText` Cloud Function from the earlier design was deleted entirely, not kept
  dormant — unlike `onReactionWrite`/`onCommentWrite`/`setModeratorClaim` (see
  `functions/README.md`), which stay in the repo unused until/unless the project moves to
  Blaze. The distinction: those three still make sense to deploy later even with BYOK
  unchanged, whereas a Gemini proxy function is specifically pointless once BYOK is the
  permanent design — keeping it around would be dead code with no future use case, not a
  head start on future work.
- `src/config/app.config.js` has no client-side AI API key export anymore. If one is ever
  reintroduced here, that's a regression back to the original exposed-shared-key finding — the
  key belongs in `apiKey.storage.js`, per-user, never in a build-time env var.
