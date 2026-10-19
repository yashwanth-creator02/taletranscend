# TaleTranscend Cloud Functions

Server-side logic that shouldn't live in the client bundle or be reimplemented as Firestore
rule exceptions. See `docs/MIGRATION_PLAN.md` Phase 6 for why each of these exists.

## Functions

| Function            | Type              | Purpose                                                                           |
| ------------------- | ----------------- | --------------------------------------------------------------------------------- |
| `onReactionWrite`   | Firestore trigger | Keeps `tales/{taleId}.reactionCount` in sync with the `reactions/` subcollection  |
| `onCommentWrite`    | Firestore trigger | Keeps `tales/{taleId}.commentCount` in sync with the `comments/` subcollection    |
| `sitemap`           | HTTP (onRequest)  | Serves a dynamic `sitemap.xml` built from published tales and their chapters      |
| `setModeratorClaim` | Callable          | Grants/revokes the `moderator` custom claim `firestore.rules`' `isAdmin()` checks |

## Setup

```bash
cd functions
npm install
```

### AI access is BYOK, not a proxy

Earlier revisions proxied Gemini through a `generateAiText` callable so that a server-held key
never reached the browser. **That function has been removed.** Each user now supplies their own
Gemini key; it is stored in that browser only and passed directly to Google from
`src/services/ai.service.js` and `src/pages/profile/ai-name.js`. The reasoning is recorded in
`docs/decisions/0003-byok-ai-instead-of-cloud-function-proxy.md`.

Practical consequences:

- There is no `GEMINI_API_KEY` function secret to set.
- No AI key is stored in this repo or in `.env`.
- AI features are opt-in per user and degrade silently to `null` when no key is present.

### Bootstrapping the first admin

`setModeratorClaim` requires the caller to already have the `admin` custom claim — by design,
so a callable can't grant itself admin with no prior admin (that would be a privilege
escalation hole, not a convenience). The very first admin on a fresh project has to be set
manually, once, via the Firebase console's custom claims UI or a one-off script using the
Admin SDK:

```js
// one-off script, run once, not part of this repo's normal deploy
import { getAuth } from 'firebase-admin/auth';
await getAuth().setCustomUserClaims(FIRST_ADMIN_UID, { admin: true });
```

## Local development

```bash
npm run build       # compile TypeScript to lib/
npm run serve        # build + start the Functions emulator (paired with the Firestore
                      # emulator config in the repo root's firebase.json)
npm run shell         # interactive shell for calling functions directly
```

## Deployment status

**These functions are not deployed.** They are written and type-checked in CI (the
`functions-typecheck` job in `.github/workflows/ci.yml`) but no Cloud Function of any kind
runs in production, because deploying them requires the Blaze plan and this project stays on
the free Spark plan.

`.github/workflows/deploy.yml` deploys `hosting,firestore:rules,firestore:indexes` on every
push. Rules and indexes ARE live in production even though these functions are not — which is
why a rule that validates a field the client never sends breaks the feature immediately. The
client-side increments in `src/services/*` are therefore not a fallback for absent functions;
they are the production implementation.

Keep the code compiling — that CI job exists to catch breakage — but do not assume these run.
Behaviour that depends on them is currently absent in production.

### Resolved: `reactionCount` ownership

`reactionCount` is **client-owned**. `src/services/resonance.service.js` increments it in the
same gesture that writes or deletes `reactions/{uid}`, and that is the only workable option
while the project is on Spark.

`onReactionWrite` is now **intentionally a no-op** so that deploying these functions can never
double-count a resonance. Do not restore its increment unless the client increment is removed
in the same change. See `docs/decisions/0006-reaction-count-ownership.md`.

`onCommentWrite` still owns `commentCount` — the client does not touch it, so there is no
double-writer there and no change was needed.

## Deploy

Requires the Blaze plan. Once enabled:

```bash
npm run deploy        # firebase deploy --only functions
```
