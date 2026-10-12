# Directive: Navigation, Hierarchical Routing, and Sitemaps

## Goal

Define and enforce standards for URL structure, deep-path route resolution, client-side navigation safety, and automated XML/HTML sitemap discovery across TaleTranscend.

## When this fires

- Adding or updating internal links, navigation bars, docks, or router utilities.
- Creating or editing deep routes under `/tales/` or `/tales/:id/read/:chapter`.
- Modifying `src/utils/navigation.ts`, `vite.config.js`, or `firebase.json` routing configurations.
- Regenerating or indexing sitemaps (`public/sitemap.xml`, `src/views/toc.html`).

## Inputs

- Navigation utility: `src/utils/navigation.ts`.
- Routing configuration: `firebase.json`, `vite.config.js`.
- Template builders: `src/ui/components/nav/nav.templates.js`.
- Sitemap assets: `public/sitemap.xml`, `src/views/toc.html`, `src/pages/toc/`.

## Git Safety (If Modifying Code)

- Always create a dedicated feature or bugfix branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` strictly require explicit user approval in the conversation.

## Architectural Principles & Rules

### 1. Hierarchical Clean URL Scheme

TaleTranscend enforces human-readable, canonical hierarchical URLs:

- Tale detail: `/tales/{taleId}` (rewritten to `/tale.html?id={taleId}`)
- Reader chapter: `/tales/{taleId}/read/{chapterIndex}` (rewritten to `/reader.html?id={taleId}&ch={chapterIndex}`)
- Living Codex / Table of Contents: `/toc` (rewritten to `/toc.html`)
- All tale URLs must be generated via centralized helpers `taleUrl(id)` and `readerUrl(id, chapter)` in `src/utils/navigation.ts`. Never construct ad-hoc string templates in page code.

### 2. Dual-Environment Route Parity (Vite + Firebase)

Both local development and production hosting must handle identical clean URLs without 404s:

- **Firebase Hosting**: Managed via rewrites in `firebase.json`:
  - `{"source": "/tales/**/read/**", "destination": "/reader.html"}`
  - `{"source": "/tales/**", "destination": "/tale.html"}`
  - `{"source": "/toc", "destination": "/toc.html"}`
- **Vite Dev Server**: Managed via `hierarchicalRoutesPlugin` in `vite.config.js`, ensuring middleware rewrites deep request paths before Vite resolves files against `src/views`.

### 3. Deep-Path Navigation Trap & `resolveHref` Rule

In an MPA served at deep hierarchical paths (such as `/tales/tale-007`), bare relative paths (e.g. `href="library.html"`) resolve relative to the current virtual directory (`/tales/library.html`), causing 404 errors.

- **Rule**: All internal navigation links, template URLs, and redirects MUST pass through `resolveHref()` from `@/utils`.
- **Root-Relative Normalization**: `resolveHref()` normalizes view names (`'library'` or `'library.html'`) to root-relative paths (`/library.html`).
- **Static Asset Guard**: `resolveHref()` must never append `.html` to static assets (`.png`, `.svg`, `.ico`, `.webp`, `.jpg`, `.jpeg`, `.gif`, `.avif`, `.css`, `.js`, `.json`, `.xml`, `.txt`). When passed an asset target (e.g. `'logo.png'` or `'/logo.png'`), it resolves cleanly to `/logo.png`.

### 4. Search Engine & Discovery Sitemaps

TaleTranscend maintains dual sitemaps:

- **Machine-Readable XML Sitemap** (`public/sitemap.xml`): Contains indexed static entry points and dynamic tales with canonical `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>`.
- **Human-Readable Living Codex** (`src/views/toc.html` & `src/pages/toc/`): A rich interactive Table of Contents categorizing chronicles by pantheon (Greek, Norse, Egyptian, Urban Myths, etc.), chapter count, resonance score, and reading duration.

## Tools / Scripts to Use

- Run the navigation and routing test suite:
  ```powershell
  python execution/verify_navigation_and_ui.py
  ```
- Run vitest navigation tests directly:
  ```powershell
  npx vitest run src/utils/__tests__/navigation.test.js
  ```

## Outputs

- Deep links on `/tales/:id` and `/tales/:id/read/:chapter` navigate smoothly to root pages without path nesting errors.
- Both `/sitemap.xml` and `/toc.html` remain fully synchronized with archive chronicles.

## Edge Cases & Error Handling

- **Static Asset Suffix Bug**: If `resolveHref()` appends `.html` to an image (e.g. `/logo.png.html`), Vite returns a fallback `text/html` document resulting in a broken image placeholder in the browser. Always verify that asset filenames retain their exact extension.
- **Query Strings & Hashes**: `resolveHref('tale.html?id=abc#comments')` preserves query parameters and fragments exactly while ensuring the base path is root-relative.
- **External URLs**: `resolveHref` detects `http://`, `https://`, `mailto:`, `tel:`, and `#` targets and leaves them unaltered.
