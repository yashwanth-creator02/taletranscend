# Contributing to TaleTranscend

## Setup

1. **Clone the repository:**

   ```bash
   git clone <repo-url>
   cd taletranscend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment:**
   - Copy `.env.example` to `.env`.
   - Fill in your Firebase project credentials and Gemini API key.

4. **Run in development mode:**
   ```bash
   npm run dev
   ```

## Code Style

- **JavaScript:** Use ES2022 modules, follow `camelCase` for variables/functions, and ensure strict type safety through schema factories.
- **TypeScript:** Primarily used for utility modules in `src/utils/`. Maintain strict typing for these shared helpers.
- **CSS:** Prefer Tailwind utility classes. Shared design tokens live in `src/assets/css/tokens.css` — never inline a hex value, an `rgba()`/`hsl()` literal, or a page-local `:root` re-declaration of a token that already exists there. `npm run lint:tokens` enforces this and will fail your build on a violation; see the "Design System" section of `ARCHITECTURE.md` for the reasoning.
- **Firebase Paths:** Never hardcode Firestore paths. Always use the predefined functions in `src/firebase/paths.js`.

## Adding a Test

When adding new features or fixing bugs, you should include a corresponding test:

- **Unit Test:** Place tests next to the source file (e.g., `src/utils/myUtil.test.js` or in a `__tests__` subdirectory).
- **E2E Test:** Add new specifications to `e2e/specs/`.

```bash
# Run unit tests
npm test

# Run E2E tests
npm run e2e
```

## Quality Checklist

Before submitting a Pull Request, ensure:

1. [ ] All tests pass (`npm test`).
2. [ ] No lint errors (`npm run lint`).
3. [ ] No raw colour literals outside the design-token files (`npm run lint:tokens`).
4. [ ] Code is formatted (`npm run format`).
5. [ ] Schema factories are updated if the data shape changed.
6. [ ] Firestore security rules and indexes are updated if access patterns changed.

Or run all of the above (plus type-checking) in one command: `npm run verify`.

## Documentation

- If adding a new core service, update `ARCHITECTURE.md`.
- Ensure new public functions have clear JSDoc comments.
