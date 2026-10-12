# Directive: Build and Deployment Pipeline

## Goal

Execute production builds and manage deployment workflows for TaleTranscend across hosting platforms (Firebase Hosting and Vercel).

## When this fires

- Preparing releases for staging or production.
- Validating production bundle size and asset minification.
- User requests build verification or deployment execution.

## Inputs

- Production environment variables in `.env`.
- Configuration files: `vite.config.js`, `vercel.json`, `firebase.json`.

## Git Safety (If Modifying Code)

- Deployment merges must only occur on approved release branches.
- Never deploy uncommitted or unreviewed changes.

## Tools / Scripts to Use

- Production build:
  ```powershell
  npm run build
  ```
- Local production preview:
  ```powershell
  npm run preview
  ```
- Firebase Hosting deployment:
  ```powershell
  firebase deploy --only hosting
  ```
- Vercel deployment:
  ```powershell
  vercel --prod
  ```

## Outputs

- Production-ready assets in `dist/` directory.
- Deployment verification reports and live hosting URLs.

## Edge Cases & Error Handling

- Multi-page entry points: Vite config contains multi-page rollup inputs for each view under `src/views/`. Ensure all new pages are registered in `vite.config.js` rollup input options.
- Routing rewrites: Verify that `vercel.json` rewrites and `firebase.json` rewrites match MPA routing definitions.
