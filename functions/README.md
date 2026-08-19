# TaleTranscend Cloud Functions

Server-side logic that shouldn't live in the client bundle or be reimplemented as Firestore
rule exceptions. See `docs/MIGRATION_PLAN.md` Phase 6 for why each of these exists.

## Functions

| Function            | Type              | Purpose                                                                           |
| ------------------- | ----------------- | --------------------------------------------------------------------------------- |
| `onReactionWrite`   | Firestore trigger | Keeps `tales/{taleId}.reactionCount` in sync with the `reactions/` subcollection  |
| `onCommentWrite`    | Firestore trigger | Keeps `tales/{taleId}.commentCount` in sync with the `comments/` subcollection    |
| `generateAiText`    | Callable          | Proxies Gemini calls server-side, so the API key never ships to the client        |
| `setModeratorClaim` | Callable          | Grants/revokes the `moderator` custom claim `firestore.rules`' `isAdmin()` checks |

## Setup

```bash
cd functions
npm install
```

### Setting the Gemini API key secret

`generateAiText` reads its Gemini API key from a Firebase Functions secret, not an
environment variable — this is what keeps it out of the client bundle and out of source
control. Set it once per environment:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

You'll be prompted to paste the key value. It's stored in Google Secret Manager, not in this
repo or in `.env`.

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

## Deploy

```bash
npm run deploy        # firebase deploy --only functions
```
