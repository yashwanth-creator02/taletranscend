# TaleTranscend

A digital library and storytelling platform for folklore, mythology, and cultural tales.

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES2022 modules), Tailwind CSS, Vite
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Build:** Vite with PWA plugin
- **TypeScript:** Used for utility modules (`src/utils/`)

## Project Structure

...

## Testing

```bash
npm test              # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run e2e           # Run Playwright E2E tests
```

Test files live next to the code they test or in dedicated `__tests__` directories:
- `src/**/*.test.js` — Unit & integration tests
- `e2e/specs/*.spec.js` — End-to-end tests

