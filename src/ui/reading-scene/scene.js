// src/ui/reading-scene/scene.js
//
// The login reading scene, assembled one element at a time.
//
// STAGE 1 — BOOKCASE. Only the left-hand bookcase exists so far: its frame,
// its depth, and the books the seeded generator stands on each shelf. The
// right-hand case, the desk, the chair, the reader, the lamp, the mug and the
// shelf props arrive later, each as its own step.
//
// This module is a pure string builder — it returns SVG markup and touches no
// DOM; mounting lives in components/reading-scene.js. Every fill is a
// --scene-* channel reference rather than a colour, so the whole palette
// re-skins from tokens.css alone.

import { generateShelfBooks, shelfSeed, round } from './books.js';

// ── Canvas ────────────────────────────────────────────────────────────────
// Elements are drawn in the coordinates they will occupy once the whole
// composition is in place, so nothing moves as the scene fills up. Only the
// viewBox is narrowed for now, to present the bookcase on its own; it returns
// to the full frame as soon as a second element joins it.
const VB_W = 960;
const VB_H = 620;
const VB_STAGE_1 = '-54 17 470 550';

// ── Bookcase ──────────────────────────────────────────────────────────────
const CASE_W = 290;
const CASE_H = 500;
const FRAME = 17; // width of the vertical uprights
const CORNICE_H = 28; // top band
const BASE_H = 24; // base board plus the recessed plinth under it
const ROWS = 5; // shelves, the base counting as the last one
const BOARD_H = 12; // thickness of a shelf board

// Depth is shown on the flank that faces the middle of the scene, because
// that is the flank a case standing at the edge of a room actually turns
// toward the viewer. The case itself stays upright — only the merest cant
// inward so the pair will lean together over the reader later.
const SIDE_DX = 38; // how far that flank recedes
const SIDE_DY = 6; // ...and how much it climbs while receding

const CAVITY_L = FRAME;
const CAVITY_R = CASE_W - FRAME;
const CAVITY_T = CORNICE_H;
const CAVITY_B = CASE_H - BASE_H;
const ROW_GAP = (CAVITY_B - CAVITY_T) / ROWS;
const BOOK_H = ROW_GAP - BOARD_H - 6; // height budget for books on one shelf

const CASE_SEED = 20251018;
// The inner flank faces +x, so the right-hand case is this same drawing
// mirrored, not a second drawing.
const CASE_TF = 'translate(28 45) skewX(-2.5)';

// ── Light ─────────────────────────────────────────────────────────────────
// One light source, front and to the right — where the desk lamp will stand.
// Every surface takes its shading from that: front faces ramp dark to lit
// left-to-right, niches are dark at the top where the shelf above blocks the
// light, and the receding flank is the darkest plane in the drawing.
//
// Gradient stops reference tokens rather than colours, so a gradient costs no
// more to retheme than a flat fill does.
const DEFS = `<defs>
  <linearGradient id="rs-face" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" style="stop-color:rgb(var(--scene-wood-shadow-rgb))"/>
    <stop offset="0.22" style="stop-color:rgb(var(--scene-wood-mid-rgb))"/>
    <stop offset="0.78" style="stop-color:rgb(var(--scene-wood-mid-rgb))"/>
    <stop offset="1" style="stop-color:rgb(var(--scene-wood-lit-rgb))"/>
  </linearGradient>
  <linearGradient id="rs-cavity" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style="stop-color:rgb(var(--scene-wood-shadow-rgb))"/>
    <stop offset="0.6" style="stop-color:rgb(var(--scene-wood-deep-rgb))"/>
    <stop offset="1" style="stop-color:rgb(var(--scene-wood-deep-rgb))"/>
  </linearGradient>
  <linearGradient id="rs-niche" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style="stop-color:rgb(var(--scene-wood-shadow-rgb) / 0.42)"/>
    <stop offset="1" style="stop-color:rgb(var(--scene-wood-shadow-rgb) / 0)"/>
  </linearGradient>
  <linearGradient id="rs-floor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style="stop-color:rgb(var(--scene-wood-shadow-rgb) / 0)"/>
    <stop offset="1" style="stop-color:rgb(var(--scene-wood-shadow-rgb) / 0.5)"/>
  </linearGradient>
  <linearGradient id="rs-side" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" style="stop-color:rgb(var(--scene-wood-mid-rgb))"/>
    <stop offset="0.6" style="stop-color:rgb(var(--scene-wood-deep-rgb))"/>
    <stop offset="1" style="stop-color:rgb(var(--scene-wood-shadow-rgb))"/>
  </linearGradient>
  <linearGradient id="rs-spine" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" style="stop-color:rgb(var(--scene-wood-shadow-rgb) / 0.5)"/>
    <stop offset="0.4" style="stop-color:rgb(var(--scene-wood-shadow-rgb) / 0)"/>
    <stop offset="1" style="stop-color:rgb(var(--scene-page-line-rgb) / 0.34)"/>
  </linearGradient>
</defs>`;

/** `style="fill:…"` — style, not the fill attribute, so var() always resolves. */
const paint = (token, alpha) =>
  alpha == null
    ? `style="fill:rgb(var(${token}-rgb))"`
    : `style="fill:rgb(var(${token}-rgb) / ${alpha})"`;

/** Same, for strokes. Never leaves the tag open — callers close their own. */
const stroke = (token, width, alpha) =>
  `style="fill:none;stroke:rgb(var(${token}-rgb) / ${alpha});stroke-width:${width}"`;

/**
 * y of the surface the books on shelf `i` stand on: the top face of that
 * shelf's board. The last one is the base board.
 */
const surfaceY = (i) => CAVITY_T + (i + 1) * ROW_GAP;

/**
 * One book: cover colour, the shading that makes a spine read as round, a
 * wash so two books of the same colour still differ, then its tooling. A
 * tipped book is the whole thing rotated about its own foot.
 */
function renderBook(book, floor) {
  const x = round(book.x);
  const y = round(floor + book.y); // book.y is negative, growing upward
  const w = book.w;
  const h = book.h;

  const cover = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" ${paint(book.spine)}/>`;
  const shade = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" style="fill:url(#rs-spine)"/>`;
  const wash =
    Math.abs(book.tone) > 0.3
      ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" ${
          book.tone > 0
            ? paint('--scene-page-line', round(0.04 + book.tone * 0.1))
            : paint('--scene-wood-shadow', round(0.04 - book.tone * 0.08))
        }/>`
      : '';

  const marks = [];
  if (book.head) {
    // The top edge of a closed book is its page block, not its cover.
    marks.push(
      `<rect x="${x}" y="${y}" width="${w}" height="2.2" ${paint('--scene-page-line', 0.2)}/>`
    );
  }
  for (const band of book.bands) {
    marks.push(
      `<rect x="${round(x + w * 0.16)}" y="${round(y + h * band)}" width="${round(w * 0.68)}" height="${round(Math.max(2, h * 0.05))}" ${paint('--scene-page-line', 0.38)}/>`
    );
  }
  if (book.title) {
    marks.push(
      `<rect x="${round(x + w * 0.28)}" y="${round(y + h * 0.44)}" width="${round(w * 0.44)}" height="${round(Math.max(2, h * 0.045))}" rx="1" ${paint('--scene-page-line', 0.26)}/>`
    );
  }

  const body = cover + shade + wash + marks.join('');
  if (!book.lean) return body;
  // Pivot at the book's foot so it stays standing on the shelf as it tips.
  return `<g transform="rotate(${book.tilt} ${round(x + w / 2)} ${round(floor)})">${body}</g>`;
}

/**
 * Draws a complete bookcase in local space: dark cavity, board-capped shelves
 * filled by the seeded generator, uprights, cornice, recessed plinth, and the
 * receding flank that gives the whole thing its depth.
 */
function drawBookcase(seed) {
  const parts = [];
  const cavityH = CAVITY_B - CAVITY_T;
  const innerW = CAVITY_R - CAVITY_L;
  const frontW = CASE_W + 6; // cornice and base oversail the outer edge only

  // The receding flank, drawn first so everything else sits in front of it.
  const side = `M ${CASE_W},0 L ${CASE_W + SIDE_DX},${-SIDE_DY} L ${CASE_W + SIDE_DX},${CASE_H - SIDE_DY} L ${CASE_W},${CASE_H} Z`;
  parts.push(`<path d="${side}" style="fill:url(#rs-side)"/>`);
  // The shelf boards carry on into the flank. That continuation is what sells
  // the depth — without it the flank is just a dark stripe.
  for (const y of [CORNICE_H, ...Array.from({ length: ROWS }, (_, i) => surfaceY(i))]) {
    parts.push(
      `<path d="M ${CASE_W},${round(y)} L ${CASE_W + SIDE_DX},${round(y - SIDE_DY)}" ${stroke('--scene-wood-shadow', 2, 0.55)}/>`
    );
  }
  parts.push(
    `<path d="M ${CASE_W},${CAVITY_B + 14} L ${CASE_W + SIDE_DX},${round(CAVITY_B + 14 - SIDE_DY)}" ${stroke('--scene-wood-shadow', 2, 0.4)}/>`
  );

  // Cavity: darkest under the cornice, warming as it comes down to the light.
  parts.push(
    `<rect x="${CAVITY_L}" y="${CAVITY_T}" width="${innerW}" height="${cavityH}" style="fill:url(#rs-cavity)"/>`
  );

  for (let i = 0; i < ROWS; i++) {
    const floor = surfaceY(i);
    const ceiling = i === 0 ? CAVITY_T : surfaceY(i - 1) + BOARD_H;

    const books = generateShelfBooks({
      x: CAVITY_L + 5,
      width: innerW - 10,
      height: BOOK_H,
      seed: shelfSeed(seed, i),
    });
    parts.push(books.map((book) => renderBook(book, floor)).join(''));

    // Depth: the shelf above throws a band of shade down the top of the
    // niche, and the books darken where they meet the board they stand on.
    parts.push(
      `<rect x="${CAVITY_L}" y="${ceiling}" width="${innerW}" height="34" style="fill:url(#rs-niche)"/>`,
      `<rect x="${CAVITY_L}" y="${floor - 14}" width="${innerW}" height="14" style="fill:url(#rs-floor)"/>`
    );

    if (i < ROWS - 1) {
      parts.push(
        `<rect x="${CAVITY_L - 4}" y="${floor}" width="${innerW + 8}" height="${BOARD_H}" rx="1.5" style="fill:url(#rs-face)"/>`,
        `<rect x="${CAVITY_L - 4}" y="${floor}" width="${innerW + 8}" height="2.5" ${paint('--scene-wood-lit', 0.8)}/>`,
        `<rect x="${CAVITY_L - 4}" y="${floor + BOARD_H - 2}" width="${innerW + 8}" height="2" ${paint('--scene-wood-shadow', 0.6)}/>`
      );
    }
  }

  // Uprights close the cavity off with crisp edges, shadowed down both inner
  // faces where the light stops reaching.
  parts.push(
    `<rect width="${CAVITY_L}" height="${CASE_H}" style="fill:url(#rs-face)"/>`,
    `<rect x="${CAVITY_R}" width="${CASE_W - CAVITY_R}" height="${CASE_H}" style="fill:url(#rs-face)"/>`,
    `<rect x="${CAVITY_L}" y="${CAVITY_T}" width="2.5" height="${cavityH}" ${paint('--scene-wood-shadow', 0.45)}/>`,
    `<rect x="${CAVITY_R - 2.5}" y="${CAVITY_T}" width="2.5" height="${cavityH}" ${paint('--scene-wood-shadow', 0.45)}/>`,
    // The outer corner is the edge nearest the light, so it catches it.
    `<rect x="${CASE_W - 3}" y="${CORNICE_H}" width="3" height="${cavityH}" ${paint('--scene-wood-lit', 0.4)}/>`
  );

  // Cornice: a wide top plate over a narrower second tier, stepping out over
  // the outer edge and folding back into the flank.
  parts.push(
    `<rect x="-6" y="0" width="${frontW}" height="14" rx="2" style="fill:url(#rs-face)"/>`,
    `<rect x="-6" y="0" width="${frontW}" height="2.5" ${paint('--scene-page-line', 0.22)}/>`,
    `<rect x="-1" y="14" width="${CASE_W + 1}" height="${CORNICE_H - 14}" style="fill:url(#rs-face)"/>`,
    `<rect x="-1" y="${CORNICE_H - 3}" width="${CASE_W + 1}" height="3" ${paint('--scene-wood-shadow', 0.5)}/>`,
    `<path d="M ${CASE_W},0 L ${CASE_W + SIDE_DX},${-SIDE_DY}" ${stroke('--scene-page-line', 1.5, 0.18)}/>`
  );

  // Base board, then the plinth recessed behind it, with the shadow line it
  // would cast on the floor.
  parts.push(
    `<rect x="-4" y="${CAVITY_B}" width="${CASE_W + 4}" height="14" rx="1.5" style="fill:url(#rs-face)"/>`,
    `<rect x="-4" y="${CAVITY_B}" width="${CASE_W + 4}" height="2.5" ${paint('--scene-wood-lit', 0.8)}/>`,
    `<rect x="10" y="${CAVITY_B + 14}" width="${CASE_W - 20}" height="${CASE_H - CAVITY_B - 14}" ${paint('--scene-wood-deep')}/>`,
    `<rect x="10" y="${CASE_H - 4}" width="${CASE_W - 20}" height="4" ${paint('--scene-wood-shadow', 0.7)}/>`
  );

  return parts.join('');
}

/**
 * Builds the reading scene as it stands.
 *
 * @returns {string} SVG markup, un-mounted and theme-agnostic.
 */
export function buildReadingScene() {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB_STAGE_1}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" class="login-scene" data-full-view-box="0 0 ${VB_W} ${VB_H}">`,
    DEFS,
    `<g id="bookcase-left" transform="${CASE_TF}">`,
    drawBookcase(CASE_SEED),
    `</g>`,
    `</svg>`,
  ].join('');
}
