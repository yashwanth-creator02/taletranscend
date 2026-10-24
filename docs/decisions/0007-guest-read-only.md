# 0007 — Guests read; registered accounts write

## Context

The app creates a persistent Firebase Anonymous Auth session for every visitor.
Those anonymous sessions are the product's **guests**. Before this decision,
most write rules used `isAuthenticated()`, which anonymous sessions satisfy, so
a guest could post comments, react, save drafts, publish tales, apply as an
author, send missives, and file reports. The reader surfaces also treated a
present anonymous UID as a signed-in user.

The product requirement is explicit: guests may read every public surface, but
only a registered account may comment or contribute. The refusal must be
visible in the UI, with a path to sign in or sign up.

## Decision

1. Define a registered account in Firestore rules as an authenticated request
   whose Firebase provider is not `anonymous`:

   ```rules
   function isRegistered() {
     return isAuthenticated()
       && (
         !('firebase' in request.auth.token)
         || request.auth.token.firebase.sign_in_provider != 'anonymous'
       );
   }
   ```

   A custom token without a `firebase` claim is minted by a trusted server and
   is treated as registered. Real anonymous sessions always carry
   `sign_in_provider == 'anonymous'`.

2. Apply `isRegistered()` (or `isRegisteredOwner()`) to every content,
   engagement, and contribution write: profiles, drafts, published tales,
   chapters, versions, comments, replies, comment likes, reactions, reports,
   author applications, deletion requests, inquiries, and social follows.

3. Keep private reading aids available to guests: reader progress, bookmarks,
   reading lists, reading history, preferences, and notification read state.
   These are part of reading, not public contribution.

4. Add one shared client gate, `src/services/auth.guard.js`, which checks
   `auth.currentUser.isAnonymous !== true`, shows a warning toast with a
   **Sign in or sign up** action, and builds
   `/login.html?returnUrl=<current path>`. Call it before every gated write in
   the tale, reader, contribution, inquiry, profile, and resonance surfaces.

5. Backend rules remain the authority. The client gate explains the refusal;
   it does not replace the rule.

## Consequences

- Guests can read published tales, comments, and public profiles without an
  account.
- Guests can still keep local reading progress and bookmarks.
- A guest who tries to comment, react, publish, save a draft, send a missive,
  apply as an author, request deletion, or report sees the registration toast
  and can continue to login with the current page as the return target.
- Existing anonymous comments and drafts remain readable. They cannot be
  edited or deleted by the guest because those writes now require a registered
  account. Signing in or upgrading the anonymous account preserves the UID and
  restores ownership.
- Reports are gated with the rest of the writes. If guest reporting becomes a
  safety requirement, add a narrowly scoped exception rather than reopening
  all anonymous writes.
- The rules-emulator suite covers the guest boundary for reads, comments,
  replies, likes, reactions, tales, drafts, applications, deletion requests,
  inquiries, and reports.
