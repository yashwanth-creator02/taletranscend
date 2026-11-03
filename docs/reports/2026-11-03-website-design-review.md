# Website design and UX review — 2026-11-03

A systematic pass over all 11 routes, reviewed through two lenses: **TypeUI**
(typography scale, hierarchy, spacing, WCAG conformance) and **Hallmark**
(composition, repetition, casing, one clear identity).

> **Second pass (same day).** Every P0 claim was re-measured against a fresh
> dev server and a **production build**, and the scope widened to keyboard
> behaviour, reduced motion, landmarks, social/SEO metadata, error states and
> real layout shift. Two statements in the first pass were wrong and are
> corrected in place (§7, §8); new findings are in the **Addendum** at the end.

Branch: `feat/custom-error-pages` @ `2a4f312` · dev server on the worktree port ·
1440×900 and 320×800, Transcendental and Illuminated Light themes.

**Verdict.** The structure is genuinely good and should not be rebuilt: a single
token file with three coherent palettes, an MPA that keeps each page's payload
small, real empty states, a custom SVG illustration, a boot curtain, skip links,
44px phone targets, and zero document overflow at 320px. What is wrong is
concentrated and cheap to fix: the **reading surface is set in a display face
with no lowercase**, one whole login panel renders **empty**, a **dead button**
ships on all eleven error pages, and the micro-type that carries most of the
interface's meaning is **30–50% smaller than legible**. None of it needs a
redesign — it needs a pass of corrections.

## By the numbers

| Measure                                        | Value                              |
| ---------------------------------------------- | ---------------------------------- |
| Routes reviewed                                | 11 (plus 11 generated error pages) |
| `8–10px` type declarations                     | 201                                |
| `transition: all` / `transition-all`           | 150                                |
| Muted-text contrast (needs 4.5:1)              | 4.20–4.33:1                        |
| Controls under 24×24 (WCAG 2.2 §2.5.8)         | 21 across 5 pages                  |
| Reader typefaces offered / webfonts loaded     | 19 / 3                             |
| Print output for any route                     | 1 dark page, 3.0–4.5 MB            |
| Reader CLS, production build (phone / desktop) | **0.587 / 0.326** — "poor"         |
| Library first load (20 covers)                 | **3.9 MB**, all images             |
| Icon chunk shipped on every route              | 402 kB raw / **94 kB gzip**        |
| Tab stops with a visible focus ring            | 175 of 177                         |

---

## P0 — breaks the core task

### 1. Chapter prose is set in Cinzel, which has no lowercase forms

`FONTS.serif` (the default reader typeface) is `"Cinzel", "Cormorant Garamond",
Georgia, serif`, and the reader applies it to `p` at 18px/31.5px. Cinzel is a
Roman inscriptional display face whose lowercase glyphs are **small capitals**
— so every paragraph on the reading page renders as "SHE WORE A LINEN BAND
OVER HER SIGHTLESS EYES". Word shape is lost, and long-form reading slows
measurably.

Reading is the product. Reserve Cinzel for the chapter title and wordmark;
make Merriweather (or the Lora / Crimson Pro slot) the default body face.

### 2. Half of the login page is empty

`src/views/login.html:207` mounts `#login-scene` for the illustrated reading
scene. At 1440 it measures **620×0 with zero children** and throws no error.
`mountReadingScene()` exists in `src/ui/components/reading-scene.js` but has
**no caller anywhere in `src/`**. The left 50% of the first screen a new visitor
sees is a gradient with a logo.

Either call the mount on login boot, or drop the empty column and centre the
card. Leaving a deliberate-looking void is the worst of the three.

### 3. "Report this error" is a dead button, 18px tall

On all 11 generated error pages (`scripts/generate-error-pages.js:330`), the
`[data-error-report]` button has **no listener** — clicking changes no URL and
opens no dialog or toast. Its hit area is **116×18px**: below the 24×24 WCAG
2.2 §2.5.8 floor and far below the 44px phone target used elsewhere.

Wire it to the existing issue link used in the home footer, or remove it.

### 4. Print and PDF are broken on every route

There is **no `@media print` rule anywhere** in `src/assets/css`. Each page
scrolls inside `main`, so print keeps that viewport-height scroller and clips:

| Route                    | `main` height / content | PDF result      |
| ------------------------ | ----------------------- | --------------- |
| `/index.html`            | 836px / 1,896px         | 1 page, 4.46 MB |
| `/tale.html?id=tale-028` | 900px / 1,021px         | 1 page, 3.07 MB |

Readers will print or save tales. One tiny stylesheet — `main { height: auto;
overflow: visible }`, light ground, ink text, hide chrome — is the whole fix.

### 5. Sixteen of nineteen reader typefaces are never loaded

The reader offers 19 families in `src/config/theme.config.js`; the only webfont
request on all 11 pages is **Inter + Cinzel + Merriweather**. Playfair, Lora,
Crimson Pro, Spectral, Libre Baskerville, Cormorant, EB Garamond, IM Fell,
Uncial, MedievalSharp, Poppins, Nunito Sans, Outfit, JetBrains Mono, Special
Elite and **OpenDyslexic** therefore fall back to Georgia/Times/system — the
dyslexia-friendly option renders as Comic Sans MS. The picker promises a face
it cannot deliver.

Load the families the picker offers (one `css2` request, self-hosted ideally),
or cut the list to what loads. Note Cormorant is also the fallback inside
Cinzel's own stack, and it is not loaded either.

---

## P1 — systemic, high leverage

### 6. The label scale is 8–10px, and the label colour is below AA

201 declarations across the views and stylesheets set text at 8–10px, and most
of them are **functional**, not decorative: `PRESETS` 8.5px, preset chips
(Scribe/Muse/Archivist/Wanderer) 9.5px, sidebar section headings 9px, dock
labels 10px, nav labels 11px, card meta 11px, TOC era pills and stat labels
12px.

The colour those labels use, `#64748b`, measures **4.33:1** on `#030305`,
**4.23:1** on `#07070b` and **4.20:1** on `#08080a` — under 4.5:1 at every one
of those sizes. In the light theme the footer links land at **3.72:1**. White on
the accent `#8b7cf6` is **3.33:1** (11px chapter number, avatar initials).

Raise the muted token two steps (or lift it only for text under 14px), and set a
floor of **12px for labels, 14px for anything a user must read**. Decorative
eyebrows may stay small; labels in forms and navigation may not.

### 7. The error pages are a second, forked design system

The 11 error pages are generated HTML with **raw hex** for all three themes
(`#030305`, `#0b0d13`, `#f7f5f0`) and **no `:focus-visible` of their own** —
they inherit a usable ring only because they link the app stylesheet, so the
day the shared ring changes or a page is exported standalone, they lose it. The
`#boot-crest` still runs `boot-pulse 1.4s infinite` under
`prefers-reduced-motion: reduce` (verified). They look like the product but do
not follow its tokens, its focus treatment or its motion rules — and any token
change will silently miss them.

Generate them from the same custom properties and add the two missing rules; the
generator is one file.

### 8. Heading structure and landmarks

| Route                                | Problem                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `settings.html`, `contribution.html` | **No `h1`** — the outline starts at `h2`                                                                                      |
| `tale.html`                          | Two `h1` elements inside `main` (one visible, one hidden); duplicate ids `letter-author-profile-link`, `letter-author-avatar` |
| `index.html`                         | `h1` → `h4` skip (hero tablet caption)                                                                                        |
| `shelf.html`                         | `h1` → `h3` skip (empty state)                                                                                                |
| `profile.html`                       | `h2` → `h4` skip                                                                                                              |
| `toc.html`                           | 36 `h3` headings, 148 links, 11,520px of content inside an 855px scroller                                                     |
| 7 of 9 routes                        | No `aria-current="page"`                                                                                                      |

The project's own directive (`directives/accessibility_and_ui_standards.md` §4)
requires `aria-current` and meaningful ARIA; the app pages follow it well, these
routes do not. One pass fixes the outline: one `h1` per page, no level skips,
chapter rows as a list rather than headings.

### 9. Twenty-one controls below the 24×24 minimum

`reader` 10 (Reply 22px, Like 22px) · `profile` 5 (section-info 22×22,
legacy-metric 16×16) · `settings` 4 (avatar preset chips 22px) ·
`contribution` 1 (primer header 14px) · `404` 1 (18px).

Fix once in the shared control classes (`min-height: 24px`, and 44px under
`pointer: coarse`), not page by page.

### 10. One destination, three buttons, six names

On `shelf.html`, `#hero-new-tale-btn`, `#ritual-new-draft` and the
`Craft Manuscript` link all navigate to `contribution.html`; two of the three
are styled primary. Across the site the same two actions are called
_Inscribe a tale_, _Start writing_, _Submit Tale_, _New Tale_, _Craft
Manuscript_, _Submit a story_ and _Write_.

Also, `library.html`'s primary CTA bypasses `.btn-primary` (ad-hoc classes,
solid `oklch(0.511 0.262 276.966)`) while every other primary is the
indigo→violet gradient — two primary recipes on one product.

Pick one verb per action and one `.btn-primary`. Delete the duplicate CTA.

---

## P2 — polish and content

11. **Test data is on production surfaces.** The first Trending card is
    "crgtrhhhht vd" by "Scribe IXAGN" with description "trtnrntmjt…w45ejkae…",
    and the discussion panel holds "fghgrt", "dbdbd", "brbrf". It is the first
    impression of the product and the most credible signal that it is unfinished.
12. **Stale copyright.** `index.html:459` reads `© 2025` — currently 2026.
13. **Login checkbox is the browser default blue** (`accent-color: auto`); every
    other control is token-backed. One line in `tokens.css`.
14. **TOC is an 11,520px single scroller with 148 links.** Add era jump links and
    collapse each era; keep the archive feel without eighteen screens of scroll.
15. **150 `transition: all` declarations**, some on layout properties (progress
    bar width), which is the classic jank source. Narrow them to the properties
    that actually change. Same pass: the floating theme switcher duplicates the
    Settings control and adds a second control layer over the home footer.

---

## What holds up — do not "fix" these

- **One token file, three themes.** The primitive → semantic → component layers
  are real and enforced by `npm run lint:tokens`. Keep them.
- **The six mythic tag colours** are a documented, deliberate identity system
  (directive §8). The issue on the home hero is not the palette, it is that
  amber is doing _brand_ duty and _action/status_ duty at once (Voice Note,
  tags) next to the indigo primary. Keep amber for atmosphere and tags; let
  indigo own the actions.
- **Footer only on the home page**, settings without global chrome, and the
  reader's fixed shell are all deliberate and documented. They read as
  intention, not omission. (Shelf, tale, profile and contribution also render
  no global nav; `nav.global.js` says that is intentional, but on a phone
  Shelf's only escape is Back. Decide once and write it into the directive,
  which currently claims the opposite.)
- **Casing discipline** in eyebrows, nav and tags is consistent, and the
  custom illustration is a genuine differentiator. The caps problem is body
  prose in Cinzel, not the eyebrow system.

---

## Attempted order — superseded

_The first-pass order below is kept for the record; the **revised order** at the
end of the Addendum supersedes it, because the production build exposed two
defects (reader CLS, image payload) that outrank everything listed here._

1. **Afternoon, highest value:** reader default face (1), login scene (2),
   print stylesheet (4), muted token + label floor (6).
2. **Half day:** error-page generator parity (3, 7), outline and
   `aria-current` (8), control minimums (9).
3. **When the data is ready:** font loading (5), CTA and vocabulary
   consolidation (10), seed data (11), TOC navigation (14).

## Addendum — second pass, same day

Everything below was measured after the first pass, most of it against
`dist/` from `npm run build` (production CSS, code-split chunks) rather than the
dev server. Timing figures are local and modest hardware; the **shift counts and
byte sizes are structural and will reproduce wherever the app runs**.

### A1. The reader is the worst-measuring page in the app (CLS 0.587 on phone)

Cumulative Layout Shift on `/reader.html`, production build:

| Viewport         | CLS       | Largest shift                                                       |
| ---------------- | --------- | ------------------------------------------------------------------- |
| desktop 1440×900 | **0.326** | 0.226 — `main-scroll`, `top-bar-stats`, `top-bar-ch-title`          |
| phone 390×844    | **0.587** | 0.282 + 0.229 — `reader-article`, `author-row`, `reader-discussion` |

Google's threshold for "poor" is 0.25. Two mechanisms compound: the top bar and
the TOC panel paint after the article has already been laid out, and
`reader-article` enters with a `materialize` animation (transform + opacity) that
reflows the discussion block beneath it. Reserve the bar's height in the initial
markup and stop animating containers that hold measured text.

For contrast, `/index.html` measures CLS 0.000 and `/login.html` 0.000 — the
technique exists in this codebase, the reader just does not use it.

### A2. The library ships 3.9 MB of covers before you can read a title

First load of `/library.html`: **3,876 KB, of which 3,808 KB is images** — 20
cover cards, each a full-size AVIF, no `srcset`, no `sizes`, no width/height
(16 of 20 images across the page are dimensionless). `/index.html` by contrast
is 524 KB total and `/reader.html` is 210 KB.

A `?w=320/640/960` variant plus `srcset` and an explicit aspect box on the card
takes that to roughly a third without touching the layout.

### A3. A missing tale reports "you are not allowed", and a missing chapter reports nothing

- `/tale.html?id=doesnotexist` **redirects to `/403.html`**: _"The archive
  recognized you, but not your authority to open this page."_ A record that does
  not exist is not an authorisation failure; the user is told they lack
  permission for a page that was never there.
- `/reader.html?id=doesnotexist` **renders a complete reader**: "CH. 1/5",
  "CHAPTER 1 OF 5", "From · 0 min read", a TOC, a Discussion panel — with
  `Failed to load tale.` buried inside the discussion area. Nothing stops the
  five-chapter phantom, because the shell renders before the fetch resolves and
  there is no guard for an empty tale.

Both need the same branch: if the document is absent → 404 state, not 403, and
not a plausible-looking book.

### A4. The icon bundle ships a whole icon library for sixty icons

`src/ui/icons.js:54` loads Lucide with `const L = await import('lucide')`. The
build emits **`vendor-icons` at 402 kB raw / 94 kB gzip**, fetched on every
route to draw the ~60 names already enumerated in `ICON_MAP`. Named imports of
exactly those 60 (`import { createIcons, Home, Pen, ... } from 'lucide'`) cut the
chunk to single-digit kB and remove `createIcons`'s need for the full map.

It is code-split, so it does not block paint — 94 kB gzip per visit on a product
whose entire page chunk is 15–18 kB gzip.

### A5. `prefers-reduced-motion` is honoured in one place and ignored everywhere else

With reduced motion forced on, these still animate on first paint:

| Route                        | Still running                                                          |
| ---------------------------- | ---------------------------------------------------------------------- |
| all 11                       | `#boot-crest` → `boot-pulse` (infinite)                                |
| `/reader.html`               | `.particles` → `drift` — a full-viewport ambient layer                 |
| `/index.html`                | `reliquary-lamp-halo` → pulse; `reliquary-item` → book and lamp motion |
| `/shelf.html`                | `pulse`, `spin` (infinite)                                             |
| `/tale.html`                 | `comment-card animate-fade-*`                                          |
| `/login.html`                | `avatar-skeleton` → `pulse`, reliquary loops                           |
| `/library.html`, `/toc.html` | `command-panel` → `panelReveal`                                        |

The project's own directive requires the boot crest to skip when reduce is set,
and describes the particles as ambient decoration. A single
`@media (prefers-reduced-motion: reduce)` block in `tokens.css` that zeroes
`animation-duration` on decorative loops (keeping the functional ones) covers
all of it.

### A6. Landmarks: two banners, four navs, and navs without names

| Route                             | Finding                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/index.html`                     | `<header>` ×2 and `<nav>` ×4, **two of them unnamed** — a screen reader announces four navigations, none distinguishable                     |
| `/reader.html`                    | `<header>` ×2 (the second is inside `article`, which is fine) and an **unnamed `<nav>`** for the tool rail, next to the named "Reader tools" |
| `/profile.html`                   | `<header>` ×5, all top-level → five `banner` landmarks                                                                                       |
| `/settings.html`, `/library.html` | `<header>` ×2                                                                                                                                |
| `/tale.html`, `/shelf.html`       | No `nav` and no `header` at all                                                                                                              |

Only one `<header>` per page may be a banner; give each `<nav>` an
`aria-label` ("Primary", "Library filters", "Reader tools") and the landmark
list becomes navigable instead of noisy.

### A7. The two fields you actually write in are the only controls without a focus ring

Of **177 tab stops** across seven routes, **175 show a focus indicator** — the
ring system is genuinely strong, and the earlier "no focus ring" note was a
probe artifact. The two exceptions are on `/contribution.html`: the chapter
title input and the manuscript textarea. The caret is the only cue, which is
invisible in a busy editor and absent for keyboard users scanning the page.

### A8. Sharing any page of TaleTranscend produces the same card

All 21 HTML files declare the same `og:image`
(`https://taletranscend.web.app/logo-wide.png`), including `/tale.html` and
`/reader.html`, and there is **no JSON-LD anywhere** (0 `application/ld+json`,
`schema.org`, or `itemprop` in `src/views`). A shared tale shows the logo, not
its cover or author; a search engine gets no `CreativeWork` to attach.

`/login.html` also declares `canonical` = `/` and the identical title and
description as `/index.html`, so two different pages claim to be the home page.

Static `og:image` cannot be fixed without prerendering (crawlers do not run the
app's JS), which the roadmap already lists as SSR/SSG — but the canonical and
title collision can be fixed today, and `tale.html` could emit a `Book` JSON-LD
block from the same data the `<title>` already uses.

### A9. Internal links cost a redirect

`firebase.json` sets `cleanUrls: true`, but the nav and footer link to
`/index.html`, `/library.html` and so on. Firebase answers each of those with a
301 to the extensionless path — an extra round trip on the most-clicked link in
the site (the wordmark). Link to `/` and `/library` directly.

### A10. The service worker precaches 3.32 MB on first visit

`PWA v1.3.0` reports **91 precache entries, 3,320.73 KiB**. That is the whole
built app — every page chunk plus both media families — pulled down in the
background immediately after load, on top of the page the visitor asked for.
Route-splitting the precache (shell + the page visited, the rest on demand)
keeps the offline promise without the tax.

### Verified correct — do not "fix" these

Re-measured explicitly because the first pass flagged them:

- **Command palette**: opening with Ctrl+K moves focus into the dialog, Tab
  cycles between the input and Close (the Clear button is correctly not a tab
  stop), Escape closes it and focus returns to the search button. The trap works.
- **Login form**: email + password with real `<label>`s, `autocomplete="email"`
  and `current-password`, `required`, and an invalid submit announces
  _"Please enter a valid email address."_ in a live region. Well built.
- **Library empty state**: `No chronicles match "zzzzzz"` plus recovery advice.
- **Skip links** on all 11 routes; **no** empty link text; **no**
  `target="_blank"` missing `rel`.
- **Focus rings**: 175 of 177 tab stops.

### Corrections to the first pass

1. §7 said the error pages have "no `:focus-visible`". At runtime all five tab
   stops on `/404.html` show a ring, inherited from the app stylesheet. The real
   defect is only that the generator carries raw hex and its own boot pulse.
2. §8 said the tale title is both `h1` and `h2`. After load there is exactly one
   visible `h1`; the actual defect is a second, hidden `h1` inside `main` (and
   duplicate `letter-*` ids).
3. `reader.html` does carry an `h1` (the chapter title) — it simply had not
   rendered within the first probe's 1.5 s window.

### Revised order

1. **Today, cheap and visible:** reader CLS (A1), reduced-motion block (A5),
   missing-tale 404 branch (A3), icon imports (A4).
2. **Then:** library `srcset` (A2), landmarks and nav labels (A6), the two
   missing focus rings (A7), canonical and og fixes (A8).
3. **Next sprint:** prerender for per-tale social cards (A8), precache
   splitting (A10), link cleanup (A9).

## Method and limits

Evidence came from Playwright probes against the running dev server and a
production build (`npm run build`, served from `dist/`): computed styles,
contrast with canvas-resolved `oklch()` and ancestor compositing, hit-area
rects, real keyboard traversal (Tab/Escape, so `:focus-visible` applies),
heading outlines, landmark and `aria-current` inventories, `document.fonts`
requests, `PerformanceObserver` LCP/CLS, per-response byte accounting, print-media
PDF export, and full-page captures. Intermediate scripts lived in `.tmp/` and
were not committed.

Not covered: Firefox and Safari rendering, the light theme beyond four routes,
and data-dependent states (loading, error, signed-in member). Contrast figures
are for opaque surfaces only; text over an unparseable gradient was excluded
rather than guessed. Timing figures come from one local machine, so treat the
milliseconds as indicative and the **CLS values, byte totals and contrast ratios
as reproducible**.

## Remediation status

Everything below is fixed on `fix/design-audit-2026-11` and was measured
against the built output, not inferred from the diff.

| Finding                                | Now                                                                                          | Evidence                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Reader prose set in Cinzel             | Merriweather is the default; Cinzel stays in the picker                                      | `src/config/theme.config.js`                            |
| 16 of 19 reader typefaces never loaded | all stylesheets requested on reader mount; OpenDyslexic registers under its real family name | network log: googleapis, gstatic Merriweather, jsDelivr |
| Login scene empty                      | `#login-scene` 620x680 with the scene mounted                                                | built output                                            |
| Error-page report button dead          | GitHub issue link, 44px on coarse pointers, focus ring                                       | `scripts/generate-error-pages.js`                       |
| Print clipped to one page              | a 60-paragraph chapter paginates to 28 sheets; chrome hidden                                 | A4 PDF of the built reader                              |
| 8-9px micro-labels                     | every declaration and utility at the 11px floor; 10px only for decorative eyebrows           | sweep of all 11 routes                                  |
| Muted text 4.20-4.33:1                 | 4.59 / 4.62 / 7.21:1 against each theme lightest surface                                     | `tokens.css`                                            |
| No reduced motion                      | animations neutralised, spinners stay visible                                                | `base.css`                                              |
| Missing h1 on two views                | exactly one h1 per view; extra banner landmarks removed                                      | structural sweep                                        |
| 21 undersized targets                  | 7 left: four inline text links, a skip link, a breadcrumb                                    | target sweep                                            |
| 411 kB icon bundle                     | 25.2 kB (7.6 kB gzip)                                                                        | build output                                            |
| 3352 KiB precache                      | 2535 KiB; covers and PNG illustrations no longer precached                                   | build output                                            |
| Reader CLS 0.328                       | 0.290: the entrance no longer translates, header fields reserve their line box               | layout-shift trace                                      |

### Deferred, with the reason

- **Reader CLS 0.290** (target 0.1). The residual 0.2263 is the chapter body
  arriving after the fetch. Reserving a fixed height made it worse (a short
  chapter then shrank), so the honest fix is a skeleton in the reader that is
  replaced in place. That is a design decision, not a CSS patch.
- **Four inline text links under 24px** ("Browse Library" and the toc
  breadcrumb). WCAG 2.2 exempts links inside a sentence; they are left as text.
- **Light theme tag and pill contrast.** Backgrounds using `oklch()` could not
  be composited by the scanner, so those pairs were excluded rather than
  guessed.
