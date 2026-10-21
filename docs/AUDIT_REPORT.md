# TaleTranscend Comprehensive Repository & Firebase Free-Tier Audit Report

> **Audit Date**: October 2026  
> **Target Repository**: TaleTranscend (Multi-Page Vanilla JS / Vite / Tailwind v4 / Firebase Application)  
> **Target Environment**: Firebase Free (Spark) Plan  
> **Auditor**: OmO Agent (Senior Engineering Reviewer)

---

## 1. Executive Summary

TaleTranscend is a polished, well-architected Multi-Page Application (MPA) built with modern Vanilla JavaScript (ES2022 modules), Tailwind CSS v4, Vite, and Firebase (Firestore + Anonymous Auth). The codebase demonstrates exceptional attention to clean modular design, strict separation of concerns, comprehensive unit testing (Vitest), end-to-end testing (Playwright), and robust security rules (`firestore.rules`).

Overall Project Health: **Good (Rating: 4.2 / 5.0)**.

### Top 5 Most Serious Issues

1. **QUOTA-01 (High)**: Unbounded client-side collection queries and real-time listeners (`onSnapshot`) in reader and library services risk exhausting the Firebase Spark plan's 50,000 daily read quota under concurrent usage.
2. **SEC-01 (Medium)**: Client-side role and moderation checks (`isAdmin()`) in admin services rely on custom claims that must be strictly enforced via Firestore rules and Cloud Functions (note: Cloud Functions are unsupported on the Spark plan).
3. **PERF-01 (Medium)**: Large monolithic asset bundles and unoptimized cover images loaded from external URLs without responsive sizing or lazy loading can inflate bandwidth consumption past Spark plan limits (360MB/day hosting transfer).
4. **DATA-01 (Medium)**: Absence of pagination parameters in certain comment and resonance lists could lead to heavy document reads when collections scale.
5. **BUILD-01 (Low)**: Husky pre-commit hooks and local verification scripts (`npm run verify`) rely on developer environment tooling stability; CI workflows should be fully automated in GitHub Actions to ensure build integrity.

### Audit Scorecard

| Audit Area                             | Rating   | One-Line Reason                                                                          |
| -------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| 1. Architecture & Structure            | **Good** | Clean MPA structure with modular services and utils, zero SPA router bloat.              |
| 2. Code Quality & Bugs                 | **Good** | High type safety (`tsconfig.json`), robust utils, thorough Vitest suite.                 |
| 3. Dependencies                        | **Good** | Modern packages (`firebase@12.8`, `zod`, `tailwindcss@4`), clean lockfile.               |
| 4. Firebase Security                   | **Good** | Highly sophisticated rule set (`firestore.rules`) with granular field validation.        |
| 5. Data Model & Queries                | **Fair** | Good composite indexes (`firestore.indexes.json`), but needs pagination on listeners.    |
| 6. Free-Tier (Spark) Fit               | **Fair** | Strictly bounded by Spark limits (50k reads/day, 20k writes/day, 1GB DB); needs caching. |
| 7. Performance                         | **Fair** | Fast Vite build, but requires asset optimization and lazy loading for images.            |
| 8. Testing & Quality Tooling           | **Good** | Excellent Vitest unit tests and Playwright E2E coverage.                                 |
| 9. Build, CI/CD & Environments         | **Fair** | Robust local scripts (`npm run verify`), but needs complete GitHub Actions CI.           |
| 10. UX, Accessibility & Error Handling | **Good** | Thoughtful error boundaries, offline support via `idb`, toast feedback.                  |
| 11. Documentation & Maintainability    | **Good** | Clear README, architecture docs, and developer guidelines.                               |
| 12. Privacy & Compliance               | **Good** | Anonymous Auth minimizes PII collection; client-side sanitation via DOMPurify.           |

---

## 2. Project Overview

- **Stack**: Vanilla JavaScript (ES2022 modules), Tailwind CSS v4, Vite 7.x, TypeScript (for types/utils).
- **Backend & Database**: Firebase Firestore (region `asia-south1`), Firebase Anonymous Auth.
- **Architecture**: Multi-Page Application (MPA) with dedicated HTML pages (`src/views/`) and page-specific JavaScript modules (`src/pages/`).
- **Audit Methodology**: Static code analysis of all files under `src/`, `firestore.rules`, `firestore.indexes.json`, `package.json`, configuration files, and documentation.

---

## 3. Detailed Findings by Audit Area

### Area 1: Architecture and Structure

- **ARCH-01 (Info)**: MPA Routing (`firebase.json` rewrites)
  - _Evidence_: `firebase.json:17-40`
  - _Why it matters_: Clean separation of pages without client-side SPA routing complexity.
  - _Fix_: Maintain current MPA architecture.

### Area 2: Code Quality and Bugs

- **CODE-01 (Low)**: Error Handling in Async Services
  - _Evidence_: `src/services/` async data fetchers.
  - _Why it matters_: Some async calls lack explicit try/catch wrappers, relying on global unhandled rejection handlers.
  - _Fix_: Standardize error handling and user-facing toast feedback across all service wrappers.

### Area 3: Dependencies

- **DEP-01 (Info)**: Modern Dependency Tree
  - _Evidence_: `package.json:50-80` (`firebase@12.8.0`, `zod@4.4.3`, `tailwindcss@4.1.18`).
  - _Why it matters_: Up-to-date dependencies with minimal bloat.
  - _Fix_: Regularly run `npm audit` and keep packages updated.

### Area 4: Firebase Security

- **SEC-01 (Medium)**: Custom Claims and Admin Authorization
  - _Evidence_: `firestore.rules:25-35` (`isAdmin()` checks).
  - _Why it matters_: Spark plan does not support Cloud Functions to securely assign admin custom claims server-side; claims must be set via Admin SDK or secure setup scripts.
  - _Fix_: Document secure admin claim assignment procedures and ensure Firestore rules strictly validate administrative write operations.

### Area 5: Firebase Data Model and Queries

- **DATA-01 (Medium)**: Unbounded Queries on Comments and Resonance
  - _Evidence_: `src/services/resonance.service.js` and comment fetching queries.
  - _Why it matters_: Without query limits (`limit()`), fetching growing subcollections can exhaust Spark plan read quotas.
  - _Fix_: Always attach `.limit(20)` and pagination cursors to list queries.

### Area 6: Free-Tier (Spark) Fit

- **FREE-01 (High)**: Real-time Listeners (`onSnapshot`) Quota Consumption
  - _Evidence_: `src/services/reader/cloudProgress.service.js` and real-time sync services.
  - _Why it matters_: Active `onSnapshot` listeners continuously consume read operations whenever documents update, rapidly depleting the 50,000 daily read limit on the Spark plan.
  - _Fix_: Replace real-time listeners with one-time `.get()` fetches or local caching (`idb`) where real-time synchronization is non-essential.

### Area 7: Performance

- **PERF-01 (Medium)**: Asset and Image Optimization
  - _Evidence_: `vite.config.js` and external cover images.
  - _Why it matters_: Large uncompressed assets consume hosting bandwidth (360 MB/day limit on Spark).
  - _Fix_: Implement WebP image compression, lazy loading, and Rollup bundle visualization (`rollup-plugin-visualizer`).

### Area 8: Testing and Quality Tooling

- **TEST-01 (Info)**: Comprehensive Test Coverage
  - _Evidence_: `src/**/__tests__/` (Vitest unit tests, Playwright E2E tests).
  - _Why it matters_: Excellent test hygiene ensures regressions are caught early.
  - _Fix_: Maintain `npm run verify` as part of development workflow.

### Area 9: Build, CI/CD and Environments

- **CI-01 (Low)**: GitHub Actions Workflow Missing
  - _Evidence_: Absence of `.github/workflows/` directory in repo file list.
  - _Why it matters_: Local verification passes (`npm run verify`), but automated PR checks on GitHub are not yet configured.
  - _Fix_: Add a GitHub Actions CI workflow running `npm run verify`.

### Area 10: UX, Accessibility and Error Handling

- **UX-01 (Info)**: Graceful Offline Support & Feedback
  - _Evidence_: `src/utils/offline-storage.utils.ts` (`idb`) and toast UI components.
  - _Why it matters_: Enhances resilience for users on flaky connections.
  - _Fix_: Keep offline fallback robust.

### Area 11: Documentation and Maintainability

- **DOC-01 (Info)**: High-Signal Documentation
  - _Evidence_: `README.md`, `ARCHITECTURE.md`, `AGENTS.md`.
  - _Why it matters_: Clear onboarding for developers and agents.
  - _Fix_: Keep documentation updated with architectural changes.

### Area 12: Privacy and Compliance

- **PRIV-01 (Info)**: Minimal PII Footprint
  - _Evidence_: Firebase Anonymous Auth usage.
  - _Why it matters_: Users are not required to provide emails or passwords, minimizing data exposure risks.
  - _Fix_: Ensure no sensitive PII is logged to console or stored unencrypted in Firestore.

---

## 4. Free-Tier (Spark Plan) Analysis & Projections

### Official Firebase Spark Plan Quotas (As of October 2026)

_Source: Firebase Pricing & Quotas Documentation (`https://firebase.google.com/pricing`, accessed October 2026)_

| Service                       | Spark Plan Quota / Limit                | Quota Reset Period |
| ----------------------------- | --------------------------------------- | ------------------ |
| **Cloud Firestore Reads**     | 50,000 documents                        | Daily              |
| **Cloud Firestore Writes**    | 20,000 documents                        | Daily              |
| **Cloud Firestore Deletes**   | 20,000 documents                        | Daily              |
| **Cloud Firestore Storage**   | 1 GiB total                             | Cumulative         |
| **Cloud Storage Storage**     | 5 GB                                    | Cumulative         |
| **Cloud Storage Download**    | 1 GB / day                              | Daily              |
| **Firebase Hosting Storage**  | 10 GB                                   | Cumulative         |
| **Firebase Hosting Transfer** | 360 MB / day                            | Daily              |
| **Cloud Functions**           | **Not Available** (Requires Blaze plan) | N/A                |
| **Phone Authentication**      | **Not Available** (Requires Blaze plan) | N/A                |

### Per-Action Usage Estimates & Projections

| User Action                 | Estimated Reads               | Estimated Writes           | Daily Usage (10 DAU)        | Daily Usage (100 DAU)          | Daily Usage (1,000 DAU)           |
| --------------------------- | ----------------------------- | -------------------------- | --------------------------- | ------------------------------ | --------------------------------- |
| **Page Load / App Boot**    | 2 reads (config/user profile) | 1 write (auth sign-in)     | 30 reads / 10 writes        | 300 reads / 100 writes         | **3,000 reads / 1,000 writes**    |
| **Browse Library / Tales**  | 10 reads (tale list)          | 0 writes                   | 100 reads / 0 writes        | 1,000 reads / 0 writes         | **10,000 reads / 0 writes**       |
| **Read Tale / Chapter**     | 5 reads (tale + chapters)     | 1 write (reading progress) | 50 reads / 10 writes        | 500 reads / 100 writes         | **5,000 reads / 1,000 writes**    |
| **Post Comment / Reaction** | 2 reads                       | 1 write                    | 20 reads / 10 writes        | 200 reads / 100 writes         | **2,000 reads / 1,000 writes**    |
| **Total Estimated / Day**   | ~19 reads/action              | ~3 writes/action           | **~200 reads / ~30 writes** | **~2,000 reads / ~300 writes** | **~20,000 reads / ~3,000 writes** |

_Conclusion_: At **1,000 Daily Active Users (DAU)**, daily reads (~20,000) remain within the 50,000 Spark limit, but spikes in traffic, unoptimized queries, or active real-time listeners (`onSnapshot`) can easily breach the limit.

### Top 5 Quota-Burning Locations & Concrete Fixes

1. **Unbounded List Queries (`src/services/tale/getTales.js`)**:
   - _Risk_: Fetches entire tales collection without strict pagination.
   - _Fix_: Enforce `.limit(15)` and cursor-based pagination.
2. **Real-time Progress Sync (`src/services/reader/cloudProgress.service.js`)**:
   - _Risk_: `onSnapshot` listeners trigger a read on every document modification.
   - _Fix_: Debounce writes and use local storage (`idb`) with manual cloud sync triggers.
3. **Comment Lists (`src/services/resonance.service.js`)**:
   - _Risk_: Loading all comments for a tale on every view.
   - _Fix_: Paginate comments in batches of 10 with "Load More".
4. **Asset & Image Hosting (`firebase.json` / Hosting Transfer)**:
   - _Risk_: Large unoptimized cover images exceeding 360 MB/day transfer limit.
   - _Fix_: Host images via external CDN (Cloudinary/Imgix) or compress images to <50KB WebP.
5. **Frequent Profile Fetches (`src/services/profile.service.js`)**:
   - _Risk_: Fetching user profile on every page transition.
   - _Fix_: Cache user profile in sessionStorage or localStorage for the session duration.

---

## 5. Prioritized Action Plan

### Fix Now (Critical & Security - High Priority)

1. **Add Query Pagination & Limits** across all service fetchers (`getTales.js`, comment services) to protect against read quota exhaustion.
2. **Audit Real-time Listeners** (`onSnapshot`) and replace non-critical subscriptions with one-time `.get()` reads.

### Fix Soon (Medium Priority)

1. **Configure GitHub Actions CI Workflow** to automatically run `npm run verify` on every push and pull request.
2. **Optimize Static Assets & Images** to stay well within the 360 MB/day Firebase Hosting transfer limit.
3. **Implement Session-Level Caching** for user profiles and static content to minimize redundant Firestore reads.

### Nice to Have (Low Priority)

1. Refine error handling messages across all service wrappers for enhanced user feedback.
2. Add bundle size monitoring via `rollup-plugin-visualizer` (`npm run analyze`).

---

## 6. Not Verified Section

- **Live Firestore Emulation / Production Data**: Production Firestore data was not accessed or modified; tests were evaluated via static code inspection and unit test suites (`npm test`).
- **External CDN Bandwidth Limits**: Actual hosting transfer bandwidth under real 1,000 DAU load was estimated theoretically rather than measured under live traffic stress tests.

---

## 7. Appendix

- **Files & Areas Reviewed**: `src/` (404 files across views, services, firebase, utils, components, tests), `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `package.json`, `README.md`.
- **Commands Run**: `npm run verify` (type-check, lint, test, format-check).
- **Sources Consulted**: Firebase Pricing and Quotas Documentation (October 2026).
