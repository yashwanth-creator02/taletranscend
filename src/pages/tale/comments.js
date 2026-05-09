// src/pages/tale/comments.js
// Real-time comments listener and comment posting for the tale page.
// All user-generated text is escaped before rendering to prevent XSS.

import { db, appId, auth, collection, onSnapshot, addDoc, serverTimestamp } from '@fb/index.js';

/**
 * Starts a real-time listener on the tale's comments collection.
 * Renders comments sorted by newest first whenever the collection changes.
 *
 * @param {string} taleId - ID of the tale to listen to
 * @returns {Function} Unsubscribe function to stop the listener
 */
export function listenToComments(taleId) {
  const commentsRef = collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'community_tales',
    taleId,
    'comments'
  );

  return onSnapshot(commentsRef, (snap) => {
    const list = document.getElementById('comments-list');
    if (!list) return;

    const items = snap.docs
      .map((d) => d.data())
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    list.innerHTML = items.length ? items.map(renderComment).join('') : emptyState();
  });
}

/**
 * Posts a new comment to Firestore for the given tale.
 * Silently exits if the input is empty or the user is not authenticated.
 *
 * @param {string} taleId - ID of the tale to comment on
 */
export async function postComment(taleId) {
  const input = document.getElementById('comment-text');
  const text = input?.value.trim();

  if (!text || !auth.currentUser) return;

  const commentsRef = collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'community_tales',
    taleId,
    'comments'
  );

  await addDoc(commentsRef, {
    text,
    authorId: auth.currentUser.uid,
    authorName: auth.currentUser.displayName || 'Anonymous Scribe',
    timestamp: serverTimestamp(),
  });

  input.value = '';
}

/* ==================== UI Helpers ==================== */

/**
 * Renders a single comment as an HTML string.
 * All dynamic content is escaped to prevent XSS.
 *
 * @param {Object} c - Comment data object from Firestore
 * @returns {string} HTML string for the comment
 */
function renderComment(c) {
  const date = c.timestamp ? new Date(c.timestamp.seconds * 1000).toLocaleString() : 'Syncing';

  return `
    <div class="glass-card p-8 rounded-[2rem] border-l-4 border-l-indigo-600 bg-white/[0.02]">
      <div class="flex justify-between items-center mb-4">
        <span class="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
          ${escapeHTML(c.authorName || 'Unknown')}
        </span>
        <span class="text-[8px] text-zinc-600 font-black uppercase tracking-widest">
          ${escapeHTML(date)}
        </span>
      </div>
      <p class="text-sm text-zinc-400 leading-relaxed font-medium">
        ${escapeHTML(c.text)}
      </p>
    </div>
  `;
}

/**
 * Returns an empty state message for when no comments exist.
 *
 * @returns {string} HTML string for the empty state
 */
function emptyState() {
  return `
    <p class="text-[10px] text-zinc-700 font-black uppercase tracking-widest text-center py-20">
      The echoes remain silent.
    </p>
  `;
}

/**
 * Escapes HTML special characters to prevent XSS injection.
 *
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
function escapeHTML(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
