# Directive: Developer Verification and Testing

## Goal

Execute static analysis, code formatting, design token linting, TypeScript type-checking, and test suites across the TaleTranscend codebase to ensure regression-free stability before committing.

## When this fires

- Prior to creating git commits or opening pull requests.
- When the user asks to "run tests", "lint the code", "verify build", or "check tokens".
- After introducing new components, services, or style modifications.

## Inputs

- Node.js runtime environment (v20+; see `engines` in `package.json`).
- Project dependencies installed via `npm ci` (use `npm install` only when intentionally changing dependencies).

## Git Safety (If Modifying Code)

- Branch creation requirement: Always work on a dedicated branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` require explicit user consent in conversation.
- Always commit and push: complete each unit of work with a commit on the working branch, then push it (`git push -u origin <branch>` on the first push) — never leave finished work uncommitted or unpushed.
- Merges never fast-forward: when a merge is approved, use `git merge --no-ff` so branch history and the merge commit are preserved.

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
- `npm run lint`: Runs ESLint across JavaScript and TypeScript files.
- `npm run lint:tokens`: Fails on any raw colour literals outside design token definitions (`tokens.css`).
- `npm run type-check`: Validates TypeScript type safety without emitting build output.
- `npm run test:rules`: Runs the Firestore security-rules emulator suite (`firestore/tests/rules.emulator.test.ts` against the root `firestore.rules`). Requires Java and a free port 8080; stop any orphaned `java.exe` emulator process if the port is taken. A leftover `emulators:exec` run from another worktree will respawn the JVM, so stop the supervising `firebase.js emulators:exec ...` Node process first (killing the `java.exe` alone just gets it restarted).

## Environment Notes (Offline / Resource-Limited Runs)

- **Auth-less environments**: with no network route to Firebase, every page's boot gate redirects to `/login.html` (`checkNewUserGate` in `src/utils/navigation.ts`). For browser/e2e checks set `tt_has_visited` in `localStorage` first (`page.addInitScript`), otherwise all navigation lands on the login page. A developer's own browser may still browse as a guest because a stale Firebase anonymous session is cached in IndexedDB.
- **Deterministic e2e nav state**: `e2e/specs/nav-brand-menu.spec.js` blocks `googleapis|firebaseio`, sets the visit flag, waits for `#nav-user .signin-btn, #nav-user .nav-avatar` (the app's own auth callback settling) and only then drives `updateNavUser()` from the page. Injecting before the callback settles is racy: the late `updateNavUser(null)` overwrites the injected state.
- **In-page dynamic imports**: Vite's `root` is `src/views`, so source modules are served as `/@fs/<abs path>?t=<mtime>` — a hardcoded `/src/...` URL 404s. Resolve the URL from `performance.getEntriesByType('resource')` so the import shares the app's module instance.
- **Resource limits**: stop dev servers before the full unit suite and run `npx vitest run --maxWorkers=2`; vitest reports `Timeout waiting for worker to respond` / pool errors when the machine is saturated. Run Playwright with `--workers=1` (each page cold-transforms the whole module graph).
- **Live-data e2e spec**: `e2e/specs/library.spec.js` asserts on real tale cards. A normal local run reads the live `.env` project; CI sets `VITE_FIREBASE_USE_EMULATOR=true` and seeds 25 deterministic tales (`e2e/seed-emulator.mjs`) so it needs no real credentials. With neither, the error grid renders and the card assertions fail.

## Outputs

- Clean console verification output.
- Coverage reports in `coverage/` (gitignored).
- Test logs indicating passing or failing test suites.

## Edge Cases & Error Handling

- Token lint failures: If `npm run lint:tokens` fails, inspect changed files for hardcoded hex, rgb, or hsl strings. Ensure all colors use CSS custom properties defined in `src/assets/css/tokens.css`.
- E2E test failures: Playwright tests may require browser binaries. Run `npx playwright install` if browser drivers are missing.
- E2E data: a normal local run reads the live `taletranscend` project through anonymous auth, so it needs the real `.env` credentials and at least one published tale. CI instead starts the Auth and Firestore emulators, seeds them with `e2e/seed-emulator.mjs`, and points the app at them with `VITE_FIREBASE_USE_EMULATOR=true`. Use `--workers=1` when running the emulator path locally; higher parallelism times out on a busy machine.
- Pre-commit hook: Husky is configured to run lint-staged on staged files automatically.
