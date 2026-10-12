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

### Key Subcollection Scopes & Security Rule Constraints

1. **Top-Level Comments**:
   - Path: `v1/taletranscend/projects/v1/public/data/tales/${taleId}/comments/${commentId}`
   - Author ownership enforced via `authorId == request.auth.uid`.
   - Ordering: By `createdAt` descending for chronological echo streaming.

2. **Replies & Nested Echo Hierarchy**:
   - Path: `v1/taletranscend/projects/v1/public/data/tales/${taleId}/comments/${commentId}/replies/${replyId}`
   - Security rule constraint: `firestore.rules` enforces that `request.resource.data.parentId == commentId`.
   - All replies under a comment must keep `parentId: commentId` to satisfy this check, even when replying to another reply.
   - Reply-to-reply targets are tracked via `replyToId: replyId` and `replyToAuthorName: string`.
   - Nesting depth is constrained to `depth <= 5`.

3. **Soft Deletion & Preservation Policy**:
   - Comments and replies are never permanently deleted using `deleteDoc`.
   - Soft-delete mutation: Sets `text: ''`, `isDeleted: true`, and `deletedAt: serverTimestamp()`.
   - This preserves the comment thread tree and prevents orphaned child replies.

4. **Edit Metadata Tracking**:
   - Inline edits set `text: newText`, `isEdited: true`, `editedAt: serverTimestamp()`, and `updatedAt: serverTimestamp()`.

5. **Soul Resonance (Interactions)**:
   - Tracks resonance per user UID under tale interactions and reflects aggregated resonance counts on the tale document.

## Outputs

- Deployed composite indexes on Cloud Firestore.
- Validated and deployed security rules.
- Verification logs.

## Edge Cases & Error Handling

- Chronicle Preservation Policy: Rules strictly enforce author ownership and admin-only chronicle dissolution. Never relax permissions to allow non-owners or unauthenticated users to overwrite or delete tales.
- Anonymous Auth: Every user receives a persistent anonymous UID from Firebase Auth. All ownership queries must reference `request.auth.uid`.
- Nested Reply Rules Match: Always ensure `parentId` matches the top-level comment ID in payload when posting nested replies, otherwise Firestore rules reject with permission-denied.
- Test vs Production Rules: Never deploy test-mode open rules to production. Run the test emulator suite prior to rules deployment.
