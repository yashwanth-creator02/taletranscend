# Directive: Firestore Management and Security Rules

## Goal

Manage Cloud Firestore database indexes, security rules validation, and environment configuration for TaleTranscend while enforcing the Chronicle Preservation Policy.

## When this fires

- Changes to database schema, composite indexes (`firestore.indexes.json`), or security rules (`firestore.rules`).
- Deploying or verifying backend infrastructure.
- Inquiring about Firestore paths or collection scopes.

## Inputs

- `.env` configuration file populated with Firebase credentials (copied from `.env.example`).
- Firebase CLI (`npx -y firebase-tools@latest` or global `firebase`).
- Rules file: `firestore.rules`.
- Index definition file: `firestore.indexes.json`.

## Git Safety (If Modifying Code)

- Always isolate modifications on a working branch.
- Never commit security credentials (`.env`, `service-account.json`) to git.

## Tools / Scripts to Use

- Deploy indexes:
  ```powershell
  firebase deploy --only firestore:indexes
  ```
- Deploy rules:
  ```powershell
  firebase deploy --only firestore:rules
  ```
- Skills:
  - `firebase-firestore` for querying and collection setup.
  - `firebase-security-rules-auditor` for evaluating security rules posture.

## Application Database Path

All application data resides strictly under:

```
v1/taletranscend/projects/v1/
```

## Outputs

- Deployed composite indexes on Cloud Firestore.
- Validated and deployed security rules.
- Verification logs.

## Edge Cases & Error Handling

- Chronicle Preservation Policy: Rules strictly enforce author ownership and admin-only chronicle dissolution. Never relax permissions to allow non-owners or unauthenticated users to overwrite or delete tales.
- Anonymous Auth: Every user receives a persistent anonymous UID from Firebase Auth. All ownership queries must reference `request.auth.uid`.
- Test vs Production Rules: Never deploy test-mode open rules to production. Run the test emulator suite prior to rules deployment.
