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
`v1/taletranscend/projects/v1/`

### Public Data

- `/public/data/tales/{taleId}`: Tale metadata
  - `/chapters/{index}`: Individual chapter content
  - `/comments/{commentId}`: Reader comments
  - `/reactions/{uid}`: User reactions (likes, etc.)
  - `/versions/{versionId}`: Snapshots taken on each publish
- `/public/meta/featured`: Admin-curated featured tales
- `/public/meta/stats`: Global application counters

### Private User Data

- `/users/{uid}/`
  - `preferences/reader`: User-specific reader settings (theme, font size)
  - `bookmarks/{taleId}`: List of tales bookmarked by the user
  - `drafts/{draftId}`: In-progress tales before publication
  - `readerProgress/{taleId}`: Tale-level progress
    - `chapters/{index}`: Precise chapter-level scroll position
  - `readingHistory/{taleId}`: Recently visited tales
  - `notifications/{id}`: User activity notifications
  - `achievements/{id}`: Earned user badges

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
