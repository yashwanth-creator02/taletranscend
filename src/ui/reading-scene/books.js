// src/ui/reading-scene/books.js
//
// Procedural shelf filling for the login reading scene.
//
// Everything in this module is pure: no DOM, no globals, no Math.random().
// A seeded generator is what makes the scene stable — the same shelf draws
// the same books on every render, on every machine, in every test run.
//
// This file only decides WHAT books sit on a shelf. Turning those decisions
// into <rect> elements is scene.js's job, so the geometry stays readable.

/**
 * Book spine colour tokens, in palette order. These are token NAMES, not
 * colours — the scene resolves them through CSS so the palette stays
 * rethemable (and so lint-tokens never sees a literal).
 */
export const SPINE_TOKENS = [
  '--scene-spine-navy',
  '--scene-spine-teal',
  '--scene-spine-rust',
  '--scene-spine-mustard',
  '--scene-spine-sage',
  '--scene-spine-plum',
  '--scene-spine-cream',
];

/**
 * How often each spine comes round, matching SPINE_TOKENS by index. A real
 * shelf is mostly deep colours with a few accents, not an even spread — the
 * lighter spines stay rare so they stay punctuation.
 */
const SPINE_WEIGHT = [3, 3, 3, 2, 2, 2, 1];

/** Flat draw-bag of spine indices, so one rand() picks a weighted spine. */
const SPINE_POOL = SPINE_TOKENS.flatMap((_, i) => Array.from({ length: SPINE_WEIGHT[i] }, () => i));

/** Narrowest book the filler will place. */
const MIN_BOOK_W = 8;

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 * Chosen over Math.random() precisely because it is reproducible.
 *
 * @param {number} seed - Any integer; the same seed always yields the same stream.
 * @returns {() => number} Generator returning floats in [0, 1).
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives a distinct but deterministic seed per shelf, so two shelves filled
 * from the same base never come out identical.
 *
 * @param {number} base - The bookcase seed.
 * @param {number} index - Shelf index within the bookcase.
 * @returns {number}
 */
export function shelfSeed(base, index) {
  return (base * 2654435761 + index * 40503) >>> 0;
}

/**
 * Rounds to 2dp and strips trailing zeros, keeping the emitted SVG markup
 * small and diff-friendly.
 *
 * @param {number} value
 * @returns {number}
 */
export function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * True when [x, x + w) overlaps any reserved span. Reserved spans are how
 * shelf props (a plant, a globe) hold their space: books are never generated
 * underneath them.
 *
 * @param {number} x
 * @param {number} w
 * @param {Array<{ x: number, width: number }>} reserved
 * @returns {boolean}
 */
function hitsReserved(x, w, reserved) {
  return reserved.some((r) => x < r.x + r.width && x + w > r.x);
}

/**
 * Fills one shelf with books of varied width, height, colour and lean.
 *
 * The walk is a simple left-to-right cursor: place a book, advance by its
 * width, occasionally leave a gap (a volume missing from the collection) or
 * tip one over against its neighbour. Heights arrive in runs — a handful of
 * volumes of one size, then a different size — because that is how a shelf
 * actually gets arranged, and a run of matching heights reads as intentional
 * where uniformly random heights read as noise.
 *
 * @param {object} options
 * @param {number} options.x - Left edge of the usable shelf run.
 * @param {number} options.width - Width of the usable shelf run.
 * @param {number} options.height - Usable height above the shelf surface.
 * @param {number} options.seed - Seed for this shelf.
 * @param {Array<{ x: number, width: number }>} [options.reserved] - Spans props occupy.
 * @returns {Array<object>} Books, each `{ x, y, w, h, spine, lean, tilt, head, bands, title, tone }`.
 *   `y` is relative to the shelf SURFACE, i.e. the book grows upward from 0.
 */
export function generateShelfBooks({ x, width, height, seed, reserved = [] }) {
  const rand = mulberry32(seed);
  const range = (min, max) => min + rand() * (max - min);
  const books = [];
  const limit = x + width;

  let cursor = x;
  let lastSpine = -1;
  let clusterH = height * range(0.86, 0.94);
  let clusterLeft = 0;

  // The loop is bounded by the shelf width and MIN_BOOK_W, so a full shelf
  // terminates in well under 40 iterations.
  while (cursor + MIN_BOOK_W <= limit) {
    // Occasional empty stretch, as if a volume is out on loan.
    if (rand() < 0.1) {
      cursor += range(5, 16);
      continue;
    }

    // Mostly slim volumes, with the occasional fat one to break the rhythm.
    const w = rand() < 0.14 ? range(17, 24) : range(MIN_BOOK_W, 15);

    if (clusterLeft <= 0) {
      clusterH = height * range(0.72, 0.94);
      clusterLeft = 2 + Math.floor(rand() * 3);
    }
    clusterLeft -= 1;
    const h = Math.min(height, clusterH * range(0.94, 1.06));

    // A tipped book swings out past its own footprint as it rotates about its
    // foot, so its arc — not its width — is what has to fit on the shelf.
    const lean = rand() < 0.13;
    const tilt = lean ? round((rand() < 0.5 ? -1 : 1) * range(3.5, 8.5)) : 0;
    const swing = lean ? Math.abs(Math.sin((tilt * Math.PI) / 180)) * h : 0;
    const footprint = w + swing + (lean ? 2 : 0);

    if (cursor + footprint > limit) break;
    if (hitsReserved(cursor, footprint, reserved)) {
      // Hop over the prop rather than stacking books through it.
      cursor += 2;
      continue;
    }

    // Two books of one colour side by side look like a printing error.
    let spine = SPINE_POOL[Math.floor(rand() * SPINE_POOL.length)];
    if (spine === lastSpine) spine = (spine + 1) % SPINE_TOKENS.length;
    lastSpine = spine;

    // Tooled bands, near the head and sometimes near the foot.
    const bands = [];
    if (rand() < 0.45) {
      bands.push(round(range(0.1, 0.2)));
      if (rand() < 0.35) bands.push(round(range(0.78, 0.88)));
    }

    books.push({
      x: round(cursor),
      y: round(-h), // negative: books sit on the surface and rise
      w: round(w),
      h: round(h),
      spine: SPINE_TOKENS[spine],
      lean,
      tilt,
      // The top edge of a closed book is its page block, not its cover.
      head: rand() < 0.7,
      bands,
      // A stamped title block on some spines.
      title: rand() < 0.35,
      // -1..1 wash, so two books sharing a spine token still differ.
      tone: round(rand() * 2 - 1),
    });

    cursor += footprint + (rand() < 0.08 ? 1 : 0);
  }

  return books;
}
