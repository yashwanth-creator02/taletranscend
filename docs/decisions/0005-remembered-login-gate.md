# 0005 — The first-visit login gate reads an explicit auth-memory record

**Status:** Accepted
**Date:** October 2026

## Context

The first-visit login gate (`checkNewUserGate()` in `src/utils/navigation.ts`) decides whether a
visitor is sent to `/login.html`. It previously answered "is this a new visitor?" from two signals:

1. `tt_has_visited` in localStorage, written by `markUserVisited()` — which only runs on a
   successful login or when a link on the login page is clicked.
2. A probe of localStorage keys starting with `firebase:authUser`, meant to detect an existing
   Firebase session.

Signal 2 never matched anything. `firebase:authUser` is the Firebase **v8** storage format; this
app runs the modern SDK, which persists sessions in IndexedDB (`firebaseLocalStorageDb`). Verified
in a live browser: after a guest sign-in the only localStorage keys were `tt_app_theme` and
`tt_has_visited`, while the session lived in IndexedDB.

The practical consequence was the reported bug: a first-time visitor who left the login page by any
route other than clicking one of its links (back button, typed URL, closing the tab) had no memory
written, so **every** later visit was redirected to the login page again. The gate could also never
recognise a signed-in visitor whose visit flags were lost.

## Decision

Keep one explicit, versioned record per browser — `tt_auth`, defined in
`src/services/auth-memory.storage.js` — and let that record alone drive the gate, honouring the
legacy `tt_has_visited` flag on read for browsers that already hold it.

- **Scope follows the existing "Keep me signed in" checkbox.** Checked (default) writes a durable
  record in localStorage and leaves Firebase persistence at its default local scope. Unchecked
  writes a session-only record in sessionStorage, clears the durable one, and switches Firebase
  itself to `browserSessionPersistence` before signing in.
- **A restored session never changes the recorded scope.** Everything that re-remembers an account
  (a page's `initAuth`, or the login page seeing a live session) keeps whatever scope is already
  recorded — otherwise signing in unchecked and being handed over to `index.html` would silently
  upgrade a session-only choice to durable, and "Keep me signed in" would be a lie.
- **Written on:** the login page loading (a durable "gate answered" record, unless something is
  already remembered), every deliberate sign-in (Google, email, guest, with the method recorded),
  and a session restored from Firebase persistence when it belongs to a non-anonymous account.
- **Never written for a freshly auto-created anonymous session.** The app creates one on most
  pages; treating it as a returning visitor would disarm the gate entirely.
- **Cleared on:** sign-out (all `signOutAndForget()` call sites, after Firebase confirms the
  sign-out) and account deletion, which is what re-arms the gate.
- **A failed write preserves the previous memory.** localStorage can be blocked or full; in that
  case the existing record is left alone rather than cleared, because losing it would bounce a
  just-signed-in visitor straight back to the gate.
- The gate stays **synchronous**, so there is no boot delay and no flash of the login page.

## Consequences

- The login page is a first-visit experience, not a nag: it appears once, and afterwards only after
  a sign-out or account deletion. A visitor who is shown the gate and immediately leaves is not
  asked again — that is a deliberate product decision, recorded here so it is not mistaken for a
  bug. Reverting to "ask until they actually log in" means deleting the `acknowledgeGate()` call in
  `initLoginPage()`.
- **The gate acknowledgement is durable and independent of the checkbox.** The checkbox governs the
  login/session memory and Firebase's own persistence; it does not make the "I have seen this page"
  acknowledgement expire. The two meet in one edge case: a visitor who signs in unchecked, then
  opens a fresh tab (empty sessionStorage) is shown the gate once more, and _that_ visit writes a
  durable acknowledgement, so the gate will not return afterwards. The alternative — scoping the
  acknowledgement to the session — would bring back the original nag for every visitor who never
  logs in, which is the bug this record fixes.
- Storage-blocked browsers (private mode with site data disabled) cannot be remembered at all; the
  gate degrades to its old behaviour instead of throwing.
- The record is per origin. The durable record is per browser profile, so signing in on one device
  does not affect another; the session scope is per **tab**, because that is all sessionStorage
  offers. Switching between `localhost`, `127.0.0.1` and the deployed domain looks like a first
  visit each time — an easy false alarm when testing.
- Corrupt or unknown-version records are treated as absent, never as "remembered".
- The destination the gate preserves in `returnUrl` is the reason post-login navigation only
  accepts site-relative paths (`safeReturnTarget()` in `src/pages/login/login.js`): an absolute URL
  in that parameter would otherwise be an open redirect off the back of a sign-in.
