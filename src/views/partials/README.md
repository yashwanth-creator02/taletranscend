# src/views/partials/

Small HTML snippets genuinely duplicated, byte-for-byte, across multiple `src/views/*.html`
files. Included via the `<!-- @include: partials/_name.html -->` marker, resolved at build/dev
time by the `htmlIncludes()` Vite plugin in `vite.config.js`.

**This is deliberately not a general templating system.** Only extract something here if it's
genuinely identical across files today — if two pages need the same *shape* but different
*values* (most of this app's `<head>` blocks, for example — same tags, different font weights,
different viewport settings), that's not a duplication problem, leave it as separate literal
HTML in each file. See `docs/MIGRATION_PLAN.md` Phase 9 for the investigation that led to this
being a small, targeted mechanism rather than a bigger partial/include system.

## Current partials

- **`_fade-in-guard.html`** — the inline `<style>` block that sets `html { opacity: 0; ... }`
  before first paint, preventing a flash of unstyled content before
  `src/utils/navigation.ts`'s `initPageReveal()` (called by every page's entry script) takes
  over. Must be inline and in `<head>`, not an external stylesheet — an external file loaded
  asynchronously would reintroduce the exact flash this exists to prevent.
