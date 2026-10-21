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
the free Spark plan. `.github/workflows/deploy.yml` deploys Hosting and Firestore rules only.

Keep the code compiling — that CI job exists to catch breakage — but do not assume these run.
Behaviour that depends on them is currently absent in production.

### Known landmine: `reactionCount` has two writers

`src/services/resonance.service.js` increments `reactionCount` client-side, and
`onReactionWrite` increments it again from the subcollection event. Neither side guards
against the other. This is harmless today only because the trigger is not deployed. Deploying
it would double-count every resonance. Resolve the ownership before moving to Blaze.

## Deploy

Requires the Blaze plan. Once enabled:

```bash
npm run deploy        # firebase deploy --only functions
```
