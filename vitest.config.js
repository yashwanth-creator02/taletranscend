import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],

    // Run only application/unit tests by default
    include: ['src/**/*.test.js', 'src/**/*.test.ts'],

    // Exclude emulator tests from normal runs
    exclude: ['**/node_modules/**', '**/.git/**', 'firestore/tests/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,

      // Measure coverage for application source only
      include: ['src/**/*.js', 'src/**/*.ts'],

      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.config.*',
        'src/views/',
        'src/assets/',
        'src/**/*.test.js',
        'src/**/*.test.ts',
        '**/*.d.ts',
      ],

      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@css': resolve(__dirname, 'src/assets/css'),
      '@fb': resolve(__dirname, 'src/firebase'),
      '@state': resolve(__dirname, 'src/state'),
      '@services': resolve(__dirname, 'src/services'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@config': resolve(__dirname, 'src/config'),
      '@pages': resolve(__dirname, 'src/pages'),
    },
  },
});
