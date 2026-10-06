// src/services/author.service.js
// Scribe & Author Registration Service.
// Manages author verification, pen names, and missive correspondence routing.

import { getDoc, setDoc, serverTimestamp, refs } from '@fb/index.js';
import { safeAsync, createLogger, validateData, AuthorRegistrationSchema } from '@/utils';
import { cacheService } from './cache.service.js';

const log = createLogger('AuthorService');

/**
 * @typedef {Object} AuthorStatus
 * @property {boolean} isAuthor
 * @property {string} penName
 * @property {string} authorEmail
 * @property {string} authorBio
 * @property {import('firebase/firestore').Timestamp|Date|null} [authorRegisteredAt]
 */

/**
 * Retrieves the author registration status for a given user ID.
 *
 * @param {string} userId
 * @returns {Promise<AuthorStatus>}
 */
export async function getAuthorStatus(userId) {
  if (!userId) {
    return { isAuthor: false, penName: '', authorEmail: '', authorBio: '' };
  }

  return cacheService.fetchWithCache(
    `user:author-status:${userId}`,
    async () => {
      log.debug('Checking author status', { userId });
      try {
        const userSnap = await safeAsync(getDoc(refs.user(userId)), {
          fallback: { exists: () => false },
          logContext: `services.author.getAuthorStatus.${userId}`,
        });

        if (!userSnap.exists()) {
          const local = _getLocalAuthor(userId);
          if (local) return local;
          return { isAuthor: false, penName: '', authorEmail: '', authorBio: '' };
        }

        const data = userSnap.data() || {};
        const isAuthor = Boolean(
          data.isAuthor ||
          data.role === 'author' ||
          data.isVerifiedWriter ||
          (data.authorEmail && data.penName)
        );

        const status = {
          isAuthor,
          penName: data.penName || data.name || '',
          authorEmail: data.authorEmail || '',
          authorBio: data.authorBio || data.bio || '',
          authorRegisteredAt: data.authorRegisteredAt || null,
        };

        _setLocalAuthor(userId, status);
        return status;
      } catch (err) {
        log.error('Failed to get author status', err);
        return (
          _getLocalAuthor(userId) || {
            isAuthor: false,
            penName: '',
            authorEmail: '',
            authorBio: '',
          }
        );
      }
    },
    { ttl: 2 * 60 * 1000 }
  );
}

/**
 * Registers or updates the user as a verified author / scribe.
 *
 * @param {string} userId
 * @param {{ penName: string, authorEmail: string, authorBio?: string }} registrationData
 * @returns {Promise<AuthorStatus>}
 */
export async function registerAuthor(userId, registrationData) {
  if (!userId) throw new Error('User ID is required for author registration');

  const validated = validateData(AuthorRegistrationSchema, registrationData);
  if (!validated.success) {
    throw new Error(validated.error);
  }

  const { penName, authorEmail, authorBio } = validated.data;
  log.info('Registering user as author', { userId, penName, authorEmail });

  const payload = {
    isAuthor: true,
    role: 'author',
    penName: penName.trim(),
    authorEmail: authorEmail.trim(),
    authorBio: authorBio ? authorBio.trim() : '',
    authorRegisteredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const userRef = refs.user(userId);
  await safeAsync(setDoc(userRef, payload, { merge: true }), {
    logContext: 'services.author.registerAuthor',
  });

  const authorStatus = {
    isAuthor: true,
    penName: payload.penName,
    authorEmail: payload.authorEmail,
    authorBio: payload.authorBio,
    authorRegisteredAt: new Date(),
  };

  _setLocalAuthor(userId, authorStatus);
  cacheService.delete(`user:author-status:${userId}`);
  cacheService.invalidateProfile(userId);

  return authorStatus;
}

function _getLocalAuthor(userId) {
  try {
    const raw = localStorage.getItem(`tt_author_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _setLocalAuthor(userId, data) {
  try {
    localStorage.setItem(`tt_author_${userId}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota / private browsing errors
  }
}
