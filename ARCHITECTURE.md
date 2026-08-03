# TaleTranscend Architecture

## Overview

TaleTranscend is a **Multi-Page Application (MPA)** built with vanilla JavaScript and Firebase. Each page is an independent HTML file with its own entry point, bundled by Vite. This approach keeps the bundle size small and avoids the complexity of a client-side router.

## Data Flow

```plain
[Firebase Auth] → appState.userId
       ↓
[Service Layer] → Firestore queries → Schema factories → Page state → DOM render
       ↑
[User Interaction] → Event handlers → State mutation → Firestore write / localStorage
```

## Key Decisions

### Why MPA instead of SPA?

- **Simpler mental model:** Each page loads only what it needs, reducing initial payload.
- **No router complexity:** Standard browser navigation handles page transitions.
- **SEO & Performance:** Better standard SEO for public tale pages and fast first-contentful paint.
- **Auth Persistence:** Firebase Auth naturally persists across standard page navigations.

### Why no frontend framework?

- **Minimal Overhead:** Vanilla JS keeps the project dependency-free and the learning curve low.
- **Imperative Alignment:** The Firebase SDK is inherently imperative; using vanilla JS allows for a direct mapping between data fetching and UI updates without a heavy abstraction layer.

### Why schema factories?

Every Firestore read passes through a factory function (found in `src/state/schemas/`) that applies safe defaults and performs type coercion (e.g., ensuring counts are numbers). This prevents `undefined` errors from propagating and makes the data layer resilient to schema changes.

## State Management

| Scope     | Location                    | Pattern                 |
| --------- | --------------------------- | ----------------------- |
| Global    | `src/state/app.state.js`    | Mutable singleton       |
| Page      | `src/pages/{page}/state.js` | Mutable object          |
| Component | Inline in render functions  | Direct DOM manipulation |

State mutations happen via direct assignment, and UI updates are triggered by calling dedicated render functions or updating text/attributes manually.

## Firebase Path Structure

All project data is nested under the root path defined in `src/firebase/paths.js`:
`v1/taletranscend/projects/v1/`. This is kept intentionally, by decision, rather than
flattened — see `docs/MIGRATION_PLAN.md` Phase 1 (voided) and Phase 2. As of Phase 2,
`firestore/firestore.rules` mirrors this exact structure (nested under the same prefix)
instead of the flat root-level collections it used to define, which had left every one of
these paths unprotected.

### Public Data

- `/public/data/tales/{taleId}`: Tale metadata
  - `/chapters/{index}`: Individual chapter content
  - `/comments/{commentId}`: Reader comments
    - `/likes/{uid}`: Comment likes (Phase 2 rule added; no client code writes these yet)
  - `/reactions/{uid}`: User reactions (likes, etc.)
  - `/versions/{versionId}`: Snapshots taken on each publish (Phase 2 rule added)
- `/public/data/tags/{tag}`: Tag documents (Phase 2 rule added)
- `/public/meta/featured`: Admin-curated featured tales
- `/public/meta/stats`: Global application counters

> **Known gap (not fixed in Phase 2):** `featured` and `stats` are declared in `paths.js` with
> an odd number of path segments (`public/meta/featured` = 7 segments), which Firestore
> resolves as a _collection_, not a document — but `refs.js` calls both with `doc()`, which
> requires an even segment count. This mismatch likely throws a real "Invalid document
> reference" error at runtime whenever `refs.featured()` or `refs.globalStats()` is actually
> called. The Phase 2 rule for these matches the path as declared (as a collection with child
> documents); fixing the underlying path/call mismatch is a data-model decision left for a
> separate pass.

### Private User Data

- `/users/{uid}/`
  - `preferences/reader`: User-specific reader settings (theme, font size)
  - `bookmarks/{taleId}`: List of tales bookmarked by the user
  - `drafts/{draftId}`: In-progress tales before publication
    - `chapters/{index}`: Draft chapter content (Phase 2 rule added)
  - `readerProgress/{taleId}`: Tale-level progress — holds `lastReadAt` and optional
    `totalReadTimeMs` only
    - `chapters/{index}`: Precise chapter-level scroll position (`scrollPercent`,
      `lastCharacterOffset`, `updatedAt`)

    > The rule for `readerProgress/{taleId}` was rewritten in Phase 2: it used to require an
    > inline `chapters` map and `scrollPercent`/`lastChapterIndex` fields on this document
    > itself, which never matched what `cloudProgress.service.js` actually writes here (just
    > `lastReadAt`/`totalReadTimeMs` — the real per-chapter data lives in the subcollection).

  - `lists/{listId}`: Reading lists (Phase 2 rule added)
    - `tales/{taleId}`: Tales within a list (Phase 2 rule added)
  - `readingHistory/{taleId}`: Recently visited tales (Phase 2 rule added)
  - `following/{targetUid}`: Users this user follows (Phase 2 rule added)
  - `followers/{followerUid}`: Users following this user (Phase 2 rule added — note the
    writer of this document is the _follower_, not the profile owner; the rule reflects that)
  - `notifications/{id}`: User activity notifications (Phase 2 rule added; conservative
    admin-only `create`, since nothing writes these yet — see Phase 6)
  - `achievements/{id}`: Earned user badges (Phase 2 rule added; admin/system-only write)

> The `following`/`followers` feature has no client implementation yet (schema fields exist,
> nothing creates these documents) — rules were written proactively so the correct
> write-identity pattern (see above) is in place before the feature ships, rather than
> discovering the same class of bug the reaction-count issue was, after the fact.

## Security Model

- **Anonymous Auth:** All users are authenticated anonymously by default to ensure data ownership without requiring a sign-up wall.
- **Ownership-based:** Security rules (defined in `firestore.rules`) ensure users can only modify their own drafts, bookmarks, and progress.
- **Public reads:** Published tales and their metadata are globally readable by all authenticated users.

## Testing Strategy

| Layer                   | Tool       | Coverage Target |
| ----------------------- | ---------- | --------------- |
| **Schema factories**    | Vitest     | 100%            |
| **Utilities**           | Vitest     | 80%             |
| **Services (mocked)**   | Vitest     | 60%             |
| **Critical user flows** | Playwright | Core paths      |

## Known Limitations

1. **No server-side rendering (yet):** Tales are only discoverable by direct link if pre-rendered or indexed via dynamic metadata.
2. **No real-time updates:** The library and comments use batched fetching to optimize costs and complexity.
3. **Client-side validation:** Most validation happens at the factory/UI level; production should implement server-side validation via Cloud Functions.
4. **Anonymous auth only:** Users cannot currently recover accounts if they clear their browser cache or switch devices.

## Future Roadmap

- Implement **Email/OAuth** for account persistence.
- Add **Cloud Functions** for server-side validation and automated moderation.
- Implement **SSR or SSG** for better SEO on tale detail pages.
- Add **Full-text search** using Algolia or Typesense integration.
