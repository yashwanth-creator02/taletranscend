// vitest.rules.config.js

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    include: ['firestore/tests/**/*.test.ts'],
  },
});
