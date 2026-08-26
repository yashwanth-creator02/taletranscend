// vite-html-includes.js

import { readFileSync } from 'node:fs';
import path from 'node:path';

const INCLUDE_PATTERN = /<!--\s*@include:\s*([^\s]+)\s*-->/g;

export function htmlIncludes({ root }) {
  return {
    name: 'html-includes',
    transformIndexHtml(html) {
      return html.replace(INCLUDE_PATTERN, (match, includePath) => {
        const resolved = path.resolve(root, includePath);
        try {
          return readFileSync(resolved, 'utf-8').trim();
        } catch (err) {
          // Fail loudly rather than silently leaving the HTML comment in
          // the shipped output — a missing partial is a build error, not a
          // warning to scroll past.
          throw new Error(
            `htmlIncludes: could not read "${includePath}" (resolved to ${resolved}) — ${err.message}`
          );
        }
      });
    },
  };
}
