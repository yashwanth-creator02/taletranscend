# Residual design fixes — 2026-11-04

Follow-up to `2026-11-03-website-design-review.md`, covering the items that
review left open. Branch: `feat/cover-resize-cls`.

## Done

| Item                  | Change                                                                                                                    | Where                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Library cover payload | `sizedCoverUrl()` asks Unsplash for 480px (cards) / 640px (home rail) instead of the stored 1200px; other hosts untouched | `src/utils/image.utils.ts`, `taleCard.js`, `home.js` |
| `transition: all`     | 97 declarations replaced with the six properties those elements animate, each carrying the original timing                | 11 stylesheets under `src/assets/css`                |
| Breadcrumb target     | `min-height: 24px` with `padding-block` and a matching negative margin, so the baseline does not move                     | `pages/reader.css`                                   |
| Reader discussion     | Ships `hidden`, joins the layout on first render, so an empty block cannot push the article's neighbours after the reveal | `views/reader.html`, `pages/reader/reader.js`        |
| End-of-tale exit      | On the last chapter the "End of …" line gains a "Back to tale" button that returns to the tale summary                    | `pages/reader/navigation.js`, `pages/reader.css`     |
| Knowledge graph       | Rebuilt code-only: 1803 nodes, 5583 edges, 82 communities                                                                 | `graphify-out/`                                      |

## Decisions

- **Cover resizing is host-specific.** Unsplash serves any width on request;
  Firebase Storage URLs would need the resize extension. Unknown hosts return
  the input unchanged rather than a broken URL.
- **Reader CLS is not measured.** `npm run seed:tales` fails with
  `permission-denied` because `firestore.rules` rejects the seeder's anonymous
  UID, so the reader hydrates no content locally and a Playwright
  `layout-shift` observer reports 0 for the wrong reason. The discussion-block
  change removes one known shift source; the remaining number stays unverified.
- **A first mechanical pass at the transitions was reverted.** It emitted
  `opacity var(--x)` as the last list item, which gives every earlier property
  a 0s duration. The replacement rewrite is paren-aware so
  `cubic-bezier(0.4, 0, 0.2, 1)` is not split at its internal commas.
- **Tailwind `transition-all` utilities were left alone** (53 sites) per the
  scope decision to touch stylesheets only.

## Follow-ups

1. To actually measure reader CLS, either relax `firestore.rules` for a dev
   UID or point the seeder at a service account. Until then the 0.1 target is
   unproven.
2. `transition-all` Tailwind utilities remain in JS and HTML templates.
3. Light-theme tag and pill contrast is still unmeasured: `oklch()`
   backgrounds cannot be composited by the contrast scanner.
4. Branch cleanup: `feat/reader-skeleton-skeleton-cls` and
   `fix/design-residual-2026-11` hold only a placeholder test
   (`src/utils/__tests__/design-residual.test.js`) and can be deleted.
