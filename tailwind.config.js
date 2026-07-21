// tailwind.config.js
import { join } from 'path';

export default {
  content: ['./src/**/*.{html,js,ts}'],
  theme: {
    extend: {},
  },
  plugins: [],
  // Reference custom design tokens
  // This imports the CSS variables defined in tokens.css for use with Tailwind's JIT mode.
  // The actual values are applied via postcss (see postcss.config.js) and the @import in base.css
  // For Tailwind to *know* about these variables for JIT compilation, we inform it here.
  // The values themselves are still managed in tokens.css for easier global changes.
  // This allows us to use `var(--my-token)` directly in Tailwind classes if needed,
  // or for Tailwind to correctly parse classes that rely on these CSS variables.
  corePlugins: {
    // Disable preflight base styles to use custom base.css resets
    preflight: false,
  },
};
