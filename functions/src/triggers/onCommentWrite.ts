// functions/src/triggers/onCommentWrite.ts
//
// Keeps tales/{taleId}.commentCount in sync with the comments/{commentId}
// subcollection. Resolves audit Finding #5 ("dead counters") for commentCount:
// publish.js initializes it to 0, but nothing in the client ever incremented it —
// this function is what actually keeps it accurate going forward. readCount is a
// separate, harder problem (it needs to fire on READS, not writes, which a
// Firestore trigger can't observe) and is intentionally not addressed here — see
// docs/MIGRATION_PLAN.md Phase 6 for why.

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const COMMENT_PATH = 'v1/taletranscend/projects/v1/public/data/tales/{taleId}/comments/{commentId}';

export const onCommentWrite = onDocumentWritten(COMMENT_PATH, async (event) => {
  const { taleId } = event.params;
  const existedBefore = event.data?.before?.exists ?? false;
  const existedAfter = event.data?.after?.exists ?? false;

  if (existedBefore === existedAfter) return;

  const delta = existedAfter && !existedBefore ? 1 : !existedAfter && existedBefore ? -1 : 0;
  if (delta === 0) return;

  const db = getFirestore();
  const taleRef = db.doc(`v1/taletranscend/projects/v1/public/data/tales/${taleId}`);

  try {
    await taleRef.update({ commentCount: FieldValue.increment(delta) });
    logger.info('commentCount updated', { taleId, delta });
  } catch (err) {
    logger.error('Failed to update commentCount', { taleId, delta, err });
  }
});
