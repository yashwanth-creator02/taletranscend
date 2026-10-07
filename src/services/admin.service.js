// src/services/admin.service.js
// Administration service for reviewing and executing chronicle deletion petitions,
// archive maintenance, and enforcing the TaleTranscend Chronicle Preservation Policy.

import {
  auth,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  refs,
} from '@fb/index.js';
import { safeAsync, createLogger } from '@/utils';
import { createNotificationForUser } from './notification.service.js';

const log = createLogger('AdminService');

/**
 * Checks whether the currently authenticated user possesses administrator or moderator privileges.
 *
 * @param {import('firebase/auth').User} [user]
 * @returns {Promise<boolean>}
 */
export async function isCurrentUserAdmin(user = auth.currentUser) {
  if (!user) return false;
  try {
    const tokenResult = await user.getIdTokenResult?.();
    if (tokenResult?.claims?.admin || tokenResult?.claims?.moderator) {
      return true;
    }
    // Also check user profile document in Firestore
    const userDoc = await getDoc(refs.user(user.uid));
    if (userDoc?.exists?.() && userDoc.data) {
      const role = userDoc.data()?.role;
      return role === 'admin' || role === 'moderator';
    }
    return false;
  } catch (err) {
    log.warn('Failed to verify admin status:', err);
    return false;
  }
}

/**
 * Retrieves all chronicle deletion petitions submitted by authors.
 *
 * @param {string} [statusFilter='pending'] 'pending' | 'approved' | 'rejected' | 'all'
 * @returns {Promise<Array<object>>}
 */
export async function getTaleDeletionRequests(statusFilter = 'pending') {
  return safeAsync(
    (async () => {
      let q;
      if (statusFilter && statusFilter !== 'all') {
        q = query(
          refs.deletionRequests(),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(refs.deletionRequests(), orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
    })(),
    {
      fallback: [],
      logContext: 'services.admin.getTaleDeletionRequests',
    }
  );
}

/**
 * Approves a tale deletion request, dissolving the chronicle from the archive
 * and updating the petition status to 'approved'.
 * Under TaleTranscend rules, only admins can delete public tales.
 *
 * @param {{
 *   requestId: string,
 *   taleId: string,
 *   adminUid?: string,
 *   adminNotes?: string,
 *   userId?: string
 * }} params
 * @returns {Promise<{ success: boolean }>}
 */
export async function approveTaleDeletionRequest({
  requestId,
  taleId,
  adminUid = '',
  adminNotes = '',
  userId = '',
}) {
  if (!requestId || !taleId) {
    throw new Error('Request ID and Tale ID are required to process deletion approval.');
  }

  log.info('Admin approving chronicle deletion request...', { requestId, taleId, adminUid });

  // 1. Delete the tale document from the public library archive
  await safeAsync(deleteDoc(refs.tale(taleId)), {
    logContext: 'services.admin.approveTaleDeletionRequest.deleteTale',
  });

  // 2. Update the deletion petition status
  const reviewer = adminUid || auth.currentUser?.uid || 'admin';
  await safeAsync(
    updateDoc(refs.deletionRequest(requestId), {
      status: 'approved',
      reviewedBy: reviewer,
      reviewedAt: serverTimestamp(),
      adminNotes: adminNotes.trim(),
    }),
    {
      logContext: 'services.admin.approveTaleDeletionRequest.updateRequest',
    }
  );

  // 3. Dispatch notification to the author if userId is known
  if (userId) {
    await createNotificationForUser(userId, {
      type: 'system',
      title: 'Chronicle Removal Approved',
      message: `Your petition to remove chronicle ${taleId} has been approved by archive administration.`,
      link: 'profile.html',
    });
  }

  log.info('Chronicle deletion request approved and tale dissolved.', { requestId, taleId });
  return { success: true };
}

/**
 * Rejects a tale deletion request, keeping the chronicle immortalized in the archive
 * and notifying the author of the administration's decision.
 *
 * @param {{
 *   requestId: string,
 *   adminUid?: string,
 *   reason?: string,
 *   userId?: string,
 *   taleId?: string
 * }} params
 * @returns {Promise<{ success: boolean }>}
 */
export async function rejectTaleDeletionRequest({
  requestId,
  adminUid = '',
  reason = 'Preserved under TaleTranscend Chronicle Preservation Policy',
  userId = '',
  taleId = '',
}) {
  if (!requestId) {
    throw new Error('Request ID is required to reject deletion.');
  }

  log.info('Admin rejecting chronicle deletion request...', { requestId, adminUid });

  const reviewer = adminUid || auth.currentUser?.uid || 'admin';
  await safeAsync(
    updateDoc(refs.deletionRequest(requestId), {
      status: 'rejected',
      reviewedBy: reviewer,
      reviewedAt: serverTimestamp(),
      rejectionReason: reason.trim(),
    }),
    {
      logContext: 'services.admin.rejectTaleDeletionRequest.updateRequest',
    }
  );

  if (userId) {
    await createNotificationForUser(userId, {
      type: 'system',
      title: 'Chronicle Retention Notice',
      message: `Your petition to remove chronicle ${taleId || ''} was declined. The story remains preserved in the archive. Reason: ${reason}`,
      link: 'profile.html',
    });
  }

  log.info('Chronicle deletion request rejected.', { requestId });
  return { success: true };
}

/**
 * Directly removes a tale by administrative decree (e.g., copyright violation, terms breach).
 *
 * @param {{ taleId: string, adminUid?: string, reason?: string }} params
 * @returns {Promise<{ success: boolean }>}
 */
export async function adminDeleteTale({ taleId, adminUid = '', reason = '' }) {
  if (!taleId) throw new Error('Tale ID is required for administrative deletion.');

  log.warn('Administrative deletion of chronicle executed', { taleId, adminUid, reason });
  await safeAsync(deleteDoc(refs.tale(taleId)), {
    logContext: 'services.admin.adminDeleteTale',
  });
  return { success: true };
}
