import js from '@eslint/js.js';
import skipFormatting from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended, // Base recommended ESLint rules for JS
  skipFormatting, // Must come after ESLint rules to disable conflicts with Prettier
  {
    languageOptions: {
      ecmaVersion: 'latest', // Enable latest ECMAScript syntax
      sourceType: 'module', // Treat files as ES modules
      globals: {
        ...globals.browser, // Browser globals like window, document
        ...globals.node, // Node globals like process, Buffer
        firebase: 'readonly', // Your Firebase SDK global
        __initial_auth_token: 'readonly', // Custom global
        lucide: 'readonly', // Icon library global
      },
    },
    rules: {
      'no-unused-vars': 'warn', // Warn if variables are declared but never used
      'no-undef': 'error', // Error if undefined variables are used
      'prefer-const': 'error', // Prefer const over let when variables are not reassigned
      'no-console': 'off', // Allow console.log (don’t throw errors)
    },
  },
];
