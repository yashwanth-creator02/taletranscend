# Directive: Developer Verification and Testing

## Goal

Execute static analysis, code formatting, design token linting, TypeScript type-checking, and test suites across the TaleTranscend codebase to ensure regression-free stability before committing.

## When this fires

- Prior to creating git commits or opening pull requests.
- When the user asks to "run tests", "lint the code", "verify build", or "check tokens".
- After introducing new components, services, or style modifications.

## Inputs

- Node.js runtime environment (v20+; see `engines` in `package.json`).
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

- `npm run verify`: Runs format check (`prettier . --check`), lint, design token lint, type checking, and unit/integration tests in sequence.
- `npm run format:check`: Validates Prettier formatting across the repository without modifying files.
- `npm run format`: Automatically fixes Prettier formatting issues across all files.
- `npm test`: Runs Vitest unit and integration test suite.
- `npm run test:coverage`: Generates test coverage report.
- `npm run e2e`: Executes Playwright end-to-end tests.
- `node execution/capture_responsive_audit.mjs`: Sweeps every route at 320/360/390/414/768/1280/1440 (override with `AUDIT_WIDTHS` / `AUDIT_PAGES`), records `scrollWidth` plus overflowing elements, and writes full-page screenshots to `.tmp/responsive-audit/` (gitignored). Set `AUDIT_PORT` to the worktree port in `.dev-port`. Seeds `tt_has_visited`.
- `npm run lint`: Runs ESLint across JavaScript and TypeScript files.
- `npm run lint:tokens`: Fails on any raw colour literals outside design token definitions (`tokens.css`).
- `npm run type-check`: Validates TypeScript type safety without emitting build output.
- `npm run test:rules`: Runs the Firestore security-rules emulator suite (`firestore/tests/rules.emulator.test.ts` against the root `firestore.rules`). Requires Java and a free port 8080; stop any orphaned `java.exe` emulator process if the port is taken.

## Outputs

- Clean console verification output.
- Coverage reports in `coverage/` (gitignored).
- Test logs indicating passing or failing test suites.

## Edge Cases & Error Handling

- Token lint failures: If `npm run lint:tokens` fails, inspect changed files for hardcoded hex, rgb, or hsl strings. Ensure all colors use CSS custom properties defined in `src/assets/css/tokens.css`.
- E2E test failures: Playwright tests may require browser binaries. Run `npx playwright install` if browser drivers are missing.
- Responsive captures and the mobile-shell e2e: a fresh browser context is redirected to `/login.html` unless `tt_has_visited` is seeded. Both harnesses seed it and assert the page is not the login screen; never remove those guards.
- Local Playwright capacity: the shared Vite dev server can saturate above roughly 4 local workers, returning unstyled pages or `page.goto` timeouts. Run `npx playwright test --workers=2`; if the same tests pass in isolation, the app is not at fault.
- Local Vitest capacity: the default fork pool can time out starting workers on a loaded machine before any test runs. Re-run `npx vitest run --maxWorkers=2`; a green constrained run confirms the suite.
- Heavy page-graph tests: `src/pages/toc/__tests__/toc.test.js` sets a 15s timeout because its dynamic import of the full TOC page graph can cross the 5s default when the suite is parallel.
- Pre-commit hook: Husky is configured to run lint-staged on staged files automatically.
