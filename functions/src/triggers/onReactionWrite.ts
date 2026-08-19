// functions/src/triggers/onReactionWrite.ts

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const TALE_PATH = 'v1/taletranscend/projects/v1/public/data/tales/{taleId}/reactions/{reactionId}';

export const onReactionWrite = onDocumentWritten(TALE_PATH, async (event) => {
  const { taleId } = event.params;
  const before = event.data?.before;
  const after = event.data?.after;

  const existedBefore = before?.exists ?? false;
  const existedAfter = after?.exists ?? false;

  // No real change (shouldn't normally fire, but guard against it anyway)
  if (existedBefore === existedAfter) {
    return;
  }

  const delta = existedAfter && !existedBefore ? 1 : !existedAfter && existedBefore ? -1 : 0;
  if (delta === 0) return;

  const db = getFirestore();
  const taleRef = db.doc(`v1/taletranscend/projects/v1/public/data/tales/${taleId}`);

  try {
    await taleRef.update({ reactionCount: FieldValue.increment(delta) });
    logger.info('reactionCount updated', { taleId, delta });
  } catch (err) {
    // The tale document might not exist (e.g. deleted while a reaction write was
    // in flight) — log and move on rather than retrying indefinitely.
    logger.error('Failed to update reactionCount', { taleId, delta, err });
  }
});
