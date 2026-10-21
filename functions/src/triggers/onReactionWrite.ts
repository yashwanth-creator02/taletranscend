// functions/src/triggers/onReactionWrite.ts
//
// INTENTIONALLY A NO-OP.
//
// `tales/{taleId}.reactionCount` has exactly one writer: the client
// (src/services/resonance.service.js), which increments it in the same user
// gesture that creates or deletes the `reactions/{uid}` document. That is the
// only option that works on the Spark plan, where Cloud Functions cannot be
// deployed.
//
// This trigger used to increment the same field from the reaction write,
// which would double-count every reaction the moment these functions were
// deployed. It is kept as a registered function rather than deleted so the
// deploy surface stays stable and so this rationale travels with the trigger
// in `firebase deploy` output.
//
// Do not restore the increment unless the client increment is removed in the
// same change. See docs/decisions/0006-reaction-count-ownership.md.

import { onDocumentWritten } from 'firebase-functions/v2/firestore';

const TALE_PATH = 'v1/taletranscend/projects/v1/public/data/tales/{taleId}/reactions/{reactionId}';

export const onReactionWrite = onDocumentWritten(TALE_PATH, async () => {
  // No-op by design. See the file header.
  return;
});
