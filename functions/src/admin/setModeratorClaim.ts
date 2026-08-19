// functions/src/admin/setModeratorClaim.ts

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';

interface SetModeratorClaimRequest {
  targetUid: string;
  isModerator: boolean;
}

export const setModeratorClaim = onCall<SetModeratorClaimRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Only admins can grant moderator status.');
  }

  const { targetUid, isModerator } = request.data ?? {};
  if (typeof targetUid !== 'string' || targetUid.length === 0) {
    throw new HttpsError('invalid-argument', 'targetUid is required.');
  }
  if (typeof isModerator !== 'boolean') {
    throw new HttpsError('invalid-argument', 'isModerator must be a boolean.');
  }

  const auth = getAuth();
  const targetUser = await auth.getUser(targetUid);
  const existingClaims = targetUser.customClaims ?? {};

  await auth.setCustomUserClaims(targetUid, { ...existingClaims, moderator: isModerator });

  logger.info('Moderator claim updated', {
    targetUid,
    isModerator,
    grantedBy: request.auth.uid,
  });

  return { success: true, targetUid, isModerator };
});
