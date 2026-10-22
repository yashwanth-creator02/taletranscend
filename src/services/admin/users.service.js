// src/services/admin/users.service.js
import { getDoc, updateDoc, query, where, orderBy, limit, getDocs } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { ADMIN_PAGE_SIZE, fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';

export async function listUsersPage(cursor = null) {
  return fetchAdminPage(refs.tales(), {
    orderField: 'publishedAt',
    direction: 'desc',
    cursor,
    pageSize: ADMIN_PAGE_SIZE,
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(refs.user(uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateUserFlags(uid, flags) {
  const userRef = refs.user(uid);
  await updateDoc(userRef, {
    ...flags,
    updatedAt: new Date().toISOString(),
  });
  await writeAdminAuditLog({
    actorId: uid,
    actorRole: 'admin',
    action: 'user.flags.update',
    targetType: 'user',
    targetId: uid,
    summary: `Updated flags: ${Object.keys(flags).join(', ')}`,
  });
}

export async function searchUsers(queryText, _cursor = null) {
  const q = query(
    refs.tales(),
    where('authorId', '==', queryText),
    orderBy('createdAt', 'desc'),
    limit(ADMIN_PAGE_SIZE)
  );
  const snap = await getDocs(q);
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs.at(-1) ?? null,
    hasMore: snap.docs.length === ADMIN_PAGE_SIZE,
  };
}
