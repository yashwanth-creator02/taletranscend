# Mobile Compatibility Audit — 2026-10-19

Branch: `feat/mobile-compatibility` (based on `feat/comprehensive-improvements` @ `250114c`).

A full-width sweep of all 11 routes at 7 viewport widths (320 / 360 / 390 / 414 / 768 /
1280 / 1440), plus emulated-mobile e2e enforcement (Pixel 7 and iPhone 14) and a desktop
regression guard. This report is the evidence base for the mobile fixes that follow; it
records what was measured, where it came from, and the root cause of each real defect.

## Method

| Artifact                                 | Purpose                                                                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `execution/capture_responsive_audit.mjs` | Walks all routes at all widths, records per-shot `scrollWidth` + per-element overflow offenders into `.tmp/responsive-audit/` (intermediate evidence, not committed) |
| `e2e/specs/mobile-shell.spec.js`         | Playwright guard: asserts no horizontal document overflow per route at 320/390/768 on `mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 14)                      |
| `e2e/specs/library.spec.js`              | Desktop regression guard (chromium, firefox)                                                                                                                         |
| Screenshots                              | Full-page captures per route/width under `.tmp/responsive-audit/`; failure shots under `test-results/`                                                               |

Commands:

```sh
npx vite --host 127.0.0.1                                      # binds the port in .dev-port
AUDIT_PORT=5177 AUDIT_WIDTHS=320,360,390,414,768,1280,1440 \
  node execution/capture_responsive_audit.mjs
npx playwright test --workers=2 --retries=0                    # config reads .dev-port
```

`AUDIT_PORT` must match the worktree's `.dev-port` value (5177 in this worktree); the
capture script still defaults to 5175 when it is unset.

Method notes that matter for re-runs:

- Fresh browser contexts are redirected to `/login.html` by the onboarding gate
  (`checkNewUserGate`, key `tt_has_visited`). Every harness seeds that key and the capture
  script fails loudly if a shot lands on login. An earlier "green" run was measuring the
  login page; do not remove these guards.
- Captures wait for `body.booted`, then bound `document.fonts.ready` to 3s (the fonts CDN
  and `example.com` cover URLs are unreachable in this sandbox). Fallback font metrics shift
  pixel values slightly; the offender _elements_ are stable. Desktop 1280/1440 shots are the
  before/after regression evidence.
- Data-driven routes use seeded samples: `/tale.html?id=tale-008`,
  `/reader.html?taleId=tale-008&chapterId=0`. Bare `/tale.html` redirects to the library;
  bare `/reader.html` renders empty.
- On this Windows machine Playwright sometimes hangs in teardown after the last test
  (WebKit helper processes); results are still complete — kill the tree afterwards.

## Result matrix — `documentElement.scrollWidth` vs viewport

`✗` marks a real horizontal document overflow (page can be scrolled sideways).

| Route                                      | 320   | 360   | 390   | 414   | 768   | 1280   | 1440   |
| ------------------------------------------ | ----- | ----- | ----- | ----- | ----- | ------ | ------ |
| `/index.html`                              | ✗ 534 | ✗ 534 | ✗ 534 | ✗ 534 | ok    | ok     | ok     |
| `/library.html`                            | ✗ 534 | ✗ 534 | ✗ 534 | ✗ 534 | ok    | ok     | ok     |
| `/shelf.html`                              | ✗ 400 | ✗ 440 | ✗ 470 | ✗ 494 | ✗ 848 | ✗ 1360 | ✗ 1520 |
| `/tale.html?id=tale-008`                   | ok    | ok    | ok    | ok    | ok    | ok     | ok     |
| `/toc.html`                                | ✗ 438 | ✗ 438 | ✗ 438 | ✗ 438 | ok    | ok     | ok     |
| `/reader.html?taleId=tale-008&chapterId=0` | ok    | ok    | ok    | ok    | ok    | ok     | ok     |
| `/contribution.html`                       | ✗ 350 | ok    | ok    | ok    | ok    | ok     | ok     |
| `/profile.html`                            | ok    | ok    | ok    | ok    | ok    | ok     | ok     |
| `/settings.html`                           | ok    | ok    | ok    | ok    | ok    | ok     | ok     |
| `/login.html`                              | ok    | ok    | ok    | ok    | ok    | ok     | ok     |
| `/404.html`                                | ✗ 338 | ok    | ok    | ok    | ok    | ok     | ok     |

Emulated e2e reproduces the same verdicts in both engines (21 mobile-shell failures: index,
library, toc, shelf, contribution@320, 404@320; all 51 other tests green including the six
desktop library specs).

`/reader.html` is the only route with zero overflowing elements at every width — it is the
reference implementation for containment (fixed shell + internal scroll region).

## Findings — root causes

### F1. Global nav action cluster overflows every app-nav page — HIGH

At ≤414px the nav row's min-content is 534px and nothing may shrink:

- `div.nav-actions` spans x=262→534 at 320px: search icon, notifications bell,
  settings gear, and — for guests — a 106px-wide text **Sign in** button. The brand
  wordmark (~192px) on the left is not shrinkable either.
- Because the nav lives at body level (outside `.scroll-container`, which has
  `overflow-x: hidden`), the overflow becomes real document scroll on every page that
  renders `app-nav`: `/index`, `/library`, `/toc` fail in both engines.
- `/toc` measured 438 only because its auth area was still in its pre-resolve state at
  capture time (8px wide); its true min-content is the same 534.
- Engine width differences (library 534 chrome vs 466 safari @320) come from font
  fallback metrics on the text CTA — i.e. real-device text can also push this.

Fix direction: compact the mobile topbar (below ~560px) so the full set of actions stays
reachable but the row fits 320px. Verify with both engines at 320/360/390/414/768.

### F2. Shelf — decorative orbit escapes the page at _every_ width — HIGH

`/shelf.html` lines 167–168:

```html
<div class="ambient-orb w-96 h-96 bg-amber-500/10 -top-20 -right-20"></div>
<div class="ambient-orb w-96 h-96 bg-indigo-500/10 -bottom-20 -left-20"></div>
```

The right orb is parked `right: -80px`; a 384px blur renders exactly `viewport + 80`
scrollWidth at **all** widths — 400@320 … 1520@1440. This is the only route that fails
desktop: a horizontal scrollbar (and mobile sideways overscroll) caused by an invisible
decoration. Fix: clip container for the orbs (pattern exists on other pages), keeping the
visual position.

Secondary defect on the same page: the sticky vault header row (Back pill + tabs +
Voice Note + New Tale, all `shrink-0`) has a min-content of 374px, so even after the orb
fix, 320px and 360px would still scroll (right cluster reached x=374). Fix: compact the
header at very small widths.

### F3. Library — header row overflows the md band (768 up to ~1240) — MEDIUM-HIGH

At the `md` breakpoint the header becomes `[title block][controls (Browse + search w-80)]`
inside the content column (viewport minus the 256px navigation sidebar at 768). The row
needs ~958px against 768 available. The offending elements are contained by
`.scroll-container`'s `overflow-x: hidden`, so no document scroll — but the **search input
is visually clipped mid-field** at 768 (confirmed on the full-page capture) and stays
truncated until roughly 1240px.

Fix direction: let the header wrap (controls drop below the title) inside the md band, so
the search stays whole; desktop (≥1280) layout must remain unchanged.

### F4. 404 — two-button row drives whole-page shift — MEDIUM

`404.html`: `<main class="flex items-center justify-center">` sizes its child
`div.text-center.max-w-md` as a flex item. The child's min-content = the two `px-6`
buttons + gap = 356px, and `min-width: auto` forbids shrinking below it — so at 320px the
container is 356 wide, centred, and the document scrolls 338px. Fix: allow the button row
to wrap (`flex-wrap`); buttons stack only when needed and the page centres correctly.

### F5. Contribution — toolbar min-content 350px @320 — MEDIUM

The page toolbar (back, Write/Lore segmented control, auto-save cloud, Post button)
needs 350px at 320. 30px of overflow, both engines; resolves at 360. The sidebar rune
button that bleeds to x=372 is contained (sidebar clip). Fix: shave the toolbar at ≤360
(tighter gaps/padding; the status chip is the easiest sacrifice) until min-content ≤ 320.

### F6. Settings — fixed top bar hides controls below ~400px — MEDIUM

`.settings-top-bar` is `position: fixed` (never adds document scroll, so the route passes
the overflow assertion) but at 320px its right cluster sits at x=350→490 with the
`Reset` control fully off-screen — unreachable, because a fixed bar cannot be scrolled.
Fix: compact or stack the top bar under ~480px so search + actions stay on-screen.

### F7. Contained overflows — inventory (no document scroll; verify per-item)

| Route / element                                             | Verdict                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| Settings sidebar nav at ≤839px                              | Scrollable strip (`overflow-x: auto`) — by design, OK                       |
| Library era chips; toc era pills (all widths)               | Scrollable strips — by design, OK                                           |
| Profile tab strip, top action cluster, continue-reading row | Contained; reachable except a 4px left bleed on the reading list — cosmetic |
| Tale orbs, cover backdrop, tab strip, shine layer           | Contained by page clip/scroll rules — reference pattern                     |
| Fixed toast regions (login/profile/shelf/index)             | `position: fixed`, no scroll contribution — OK                              |

## Non-overflow observations (documentation only)

- Breakpoints are mixed across files: 639/640, 767/768, 839/840, 1023/1024. Do not
  broad-refactor in this pass; record the intended convention (mobile <768, tablet
  768–1023, desktop ≥1024) and align new rules with it.
- Dock label font is 8.5px — legible but below comfortable minimum (10px suggested).
  Dock tap targets are otherwise fine (full-height items in a ~60px dock).
- Small icon buttons (nav gear/bell 38px) are marginally under the 44px touch-target
  guideline; the compaction pass is a cheap opportunity to nudge these.
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` are in place on the dock —
  keep intact in any dock change.

## Fix order and verification protocol

1. F1 nav compaction → recapture + mobile e2e.
2. F2 shelf orb clip + header compaction.
3. F4 404 wrap, F5 contribution tighten, F3 library header wrap, F6 settings top bar.
4. Full verification: capture sweep (all 7 widths, expect zero ✗ in the matrix above),
   mobile e2e green in both engines, desktop `library.spec` green, 1280/1440 before/after
   captures compared, `npm run verify` clean.
5. Regression rule: any new browser tooling must seed `tt_has_visited` and assert it
   never measures `/login.html`.

Raw per-shot offender data: `.tmp/responsive-audit/metrics.json` (intermediate; reproduce
with the commands above).

## Fix log — 2026-10-20

All findings were fixed on `feat/mobile-compatibility` and re-measured with the same harness.

| Finding | Change                                                                                                                                 | Where                                   | Post-fix evidence                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| F1      | Below 560px the wordmark is hidden, the guest CTA is icon-only (`aria-label` kept), icon targets are 38px, gaps/padding tighten        | `nav.css`, `nav.templates.js`           | index/library/toc clean at 320–1280; Sign In still 123px wide at ≥768                       |
| F2      | Atmosphere layers and orbs live in a `fixed inset-0 overflow-hidden pointer-events-none -z-10` wrapper; sticky toolbar tightens ≤380px | `shelf.html`, `shelf.css`               | 320–1440 clean (was 400–1520); toolbar row 314px at 320                                     |
| F3      | Header wraps in the md band and returns to a single row at `xl` (`md:flex-wrap xl:flex-nowrap`)                                        | `library.html`                          | search whole at 768–1279; 1280/1440 match the pre-fix layout (title 520/search 848 at 1280) |
| F4      | Action row gains `flex-wrap`                                                                                                           | `404.html`                              | 320 clean                                                                                   |
| F5      | ≤359px: tighter toolbar row/pills, icon-only publish, `page-contribution` scope                                                        | `contribution.html`, `contribution.css` | 320/344 clean; 360+ keeps the label                                                         |
| F6      | ≤520px: zero side reservations, tighter gaps, search `min-width: 0` with 32px padding (base 96/64px imposed a 162px floor)             | `settings.css`                          | Reset at 268–308 at 320 with a 129px search; ≥768 untouched                                 |
| F8      | ≤600px: settings rows stack label above control, control clusters wrap, inputs fill the card, bio header stacks                        | `settings.css`                          | 11 squeezed rows at 320 → 0; avatar/name/social rows readable; ≥600 unchanged               |

F8 was found during post-fix verification, not in the original sweep: `.settings-row` is a
non-wrapping flex row with a `flex-shrink: 0` control cluster, so at 320 the label column
collapsed to 0–30px (avatar and display-name rows) and wide clusters were clipped. The
document-level matrix could not see it because `.scroll-container` clips horizontally.

### Post-fix matrix — `documentElement.scrollWidth` vs viewport

| Route                                      | 320 | 360 | 390 | 414 | 768 | 1280 | 1440 |
| ------------------------------------------ | --- | --- | --- | --- | --- | ---- | ---- |
| `/index.html`                              | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/library.html`                            | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/shelf.html`                              | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/tale.html?id=tale-008`                   | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/toc.html`                                | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/reader.html?taleId=tale-008&chapterId=0` | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/contribution.html`                       | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/profile.html`                            | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/settings.html`                           | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/login.html`                              | ok  | ok  | ok  | ok  | ok  | ok   | ok   |
| `/404.html`                                | ok  | ok  | ok  | ok  | ok  | ok   | ok   |

All 77 captures (11 routes × 7 widths) report `scrollWidth == clientWidth`. Remaining
overflowing elements are contained by design and match F7: scrollable era/tab/nav strips,
fixed toast regions, clipped shelf/profile orbs, and the hover-only relic inspector.

### Verification

- Playwright: 72/72 expected, 0 failed, 0 flaky (chromium, firefox, mobile-chrome Pixel 7,
  mobile-safari iPhone 14). The documented local teardown hang still force-kills the last
  worker after results; the run itself is complete.
- `npm run verify`: Prettier, ESLint, token lint, `tsc --noEmit`, and Vitest (103 files,
  854 passed, 2 skipped) are clean.
- Desktop guard: 1280/1440 captures were preserved before the pass
  (`.tmp/responsive-audit-before/`) and compared after. Every added rule is scoped below the
  affected width or wraps only under pressure; 1280/1440 geometry is unchanged. The shelf fix
  deliberately changes desktop stacking — the orbs now sit behind the page in a clipped layer
  instead of painting above it, at the same offsets.
- `eslint.config.js` now ignores `.tmp/**`, matching its documented intermediate status.
