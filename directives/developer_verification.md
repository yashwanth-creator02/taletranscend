# Directive: Developer Verification and Testing

## Goal

Execute static analysis, code formatting, design token linting, TypeScript type-checking, and test suites across the TaleTranscend codebase to ensure regression-free stability before committing.

## When this fires

- Prior to creating git commits or opening pull requests.
- When the user asks to "run tests", "lint the code", "verify build", or "check tokens".
- After introducing new components, services, or style modifications.

## Inputs

- Node.js runtime environment (v18+).
- Project dependencies installed via `npm install`.

## Git Safety (If Modifying Code)

- Branch creation requirement: Always work on a dedicated branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` require explicit user consent in conversation.

## Tools / Scripts to Use

Run deterministic verification via npm or through the Layer 3 execution script:

```powershell
python execution/run_verify.py
```

Or run individual npm scripts:

- `npm run verify`: Runs format check, lint, design token lint, type checking, and tests.
- `npm test`: Runs Vitest unit and integration test suite.
- `npm run test:coverage`: Generates test coverage report.
- `npm run e2e`: Executes Playwright end-to-end tests.
- `npm run lint`: Runs ESLint across JavaScript and TypeScript files.
- `npm run lint:tokens`: Fails on any raw colour literals outside design token definitions (`tokens.css`).
- `npm run format`: Runs Prettier check/format.
- `npm run type-check`: Validates TypeScript type safety without emitting build output.

## Outputs

- Clean console verification output.
- Coverage reports in `coverage/` (gitignored).
- Test logs indicating passing or failing test suites.

## Edge Cases & Error Handling

- Token lint failures: If `npm run lint:tokens` fails, inspect changed files for hardcoded hex, rgb, or hsl strings. Ensure all colors use CSS custom properties defined in `src/assets/css/tokens.css`.
- E2E test failures: Playwright tests may require browser binaries. Run `npx playwright install` if browser drivers are missing.
- Pre-commit hook: Husky is configured to run lint-staged on staged files automatically.
