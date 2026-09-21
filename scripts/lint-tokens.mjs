#!/usr/bin/env node
/**
 * scripts/lint-tokens.mjs
 *
 * Fails the build if a raw colour literal appears anywhere it shouldn't.
 *
 * The design system is only "centralized" for as long as nobody re-inlines
 * `rgba(99, 102, 241, 0.12)` into a page stylesheet during a late-night fix.
 * This is the thing that keeps it true — a comment at the top of tokens.css
 * asking people nicely does not survive contact with a deadline.
 *
 * Two files are allowed to contain raw colour, for reasons documented at the
 * bottom of tokens.css:
 *   - tokens.css        the primitives themselves have to be written somewhere
 *   - reader-themes.css twelve complete alternative palettes
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const ALLOWLIST = new Set(['src/assets/css/tokens.css', 'src/assets/css/reader-themes.css']);

/** Colour literals. Space-separated `rgb(R G B / A)` is the token syntax, so
 *  it is deliberately not matched — only the legacy comma form and hex. */
const PATTERNS = [
  { re: /#[0-9a-fA-F]{3,8}\b/g, what: 'hex colour' },
  { re: /rgba\s*\(/g, what: 'rgba() literal' },
  { re: /hsla?\s*\(\s*\d/g, what: 'hsl() literal' },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (extname(full) === '.css') out.push(full);
  }
  return out;
}

const violations = [];

for (const file of walk(join(ROOT, 'src'))) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (ALLOWLIST.has(rel)) continue;

  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Skip comments — explaining a colour is not the same as using one.
    const code = line.replace(/\/\*.*?\*\//g, '');
    if (code.trim().startsWith('*') || code.trim().startsWith('/*')) return;
    if (code.includes('fonts.googleapis.com')) return;

    for (const { re, what } of PATTERNS) {
      re.lastIndex = 0;
      const match = re.exec(code);
      if (match) violations.push({ rel, line: i + 1, what, text: match[0] });
    }
  });
}

if (violations.length === 0) {
  console.log('✓ token lint: no raw colour literals outside the design system');
  process.exit(0);
}

console.error(`\n✗ token lint: ${violations.length} raw colour literal(s) found\n`);
for (const v of violations) {
  console.error(`  ${v.rel}:${v.line}  ${v.what}  ${v.text}`);
}
console.error('\n  Use a token from src/assets/css/tokens.css instead.');
console.error('  If you need a colour that has no token yet, add it there first.\n');
process.exit(1);
