import js from '@eslint/js.js';
import skipFormatting from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  skipFormatting, // This must stay here to prevent Prettier conflicts
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        firebase: 'readonly',
        __initial_auth_token: 'readonly',
        lucide: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-console': 'off',
    },
  },
];
