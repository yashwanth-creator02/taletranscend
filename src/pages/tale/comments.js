// src/pages/tale/comments.js
// Real-time comments listener and comment posting for the tale page.
// Supports paginated loading via a Load More button.
// All user-generated text is escaped before rendering to prevent XSS.

import {
  auth,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  refs,
} from '@fb/index.js';

const PAGE_SIZE = 20;

/* ==================== Pagination State ==================== */

// Tracks the last visible Firestore document for pagination cursor
let lastVisible = null;

// Tracks whether all comments have been loaded
let allLoaded = false;

// Holds the current unsubscribe function for the real-time listener
let unsubscribe = null;

// Stores taleId for use in loadMoreComments
let currentTaleId = null;

/**
 * Starts a real-time listener on the first page of comments.
 * Renders comments sorted by newest first.
 * Shows a Load More button if there may be additional comments.
 *
 * @param {string} taleId - ID of the tale to listen to
 * @returns {Function} Unsubscribe function to stop the listener
 */
export function listenToComments(taleId) {
  currentTaleId = taleId;

  // Reset pagination state
  lastVisible = null;
  allLoaded = false;

  // Comments collection reference
  const commentsRef = refs.comments(taleId);

  // First page query
  const commentsQuery = query(commentsRef, orderBy('timestamp', 'desc'), limit(PAGE_SIZE));

  // Stop any existing listener before starting a new one
  if (unsubscribe) {
    unsubscribe();
  }

  unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
    const list = document.getElementById('comments-list');

    if (!list) return;

    // Empty state
    if (snapshot.empty) {
      list.innerHTML = emptyState();
      return;
    }

    // Store pagination cursor
    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    // If fewer than PAGE_SIZE docs came back,
    // there are no more comments to load
    allLoaded = snapshot.docs.length < PAGE_SIZE;

    // Normalize comments
    const comments = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Render comments
    list.innerHTML = comments.map(renderComment).join('');

    // Append Load More button if additional comments may exist
    if (!allLoaded) {
      list.insertAdjacentHTML('beforeend', renderLoadMoreButton());

      document.getElementById('load-more-comments')?.addEventListener('click', () => {
        loadMoreComments(currentTaleId);
      });
    }
  });

  return unsubscribe;
}

/**
 * Loads the next page of comments and appends them to the list.
 * Uses the last visible document as the Firestore pagination cursor.
 * Removes the Load More button when all comments have been loaded.
 *
 * @param {string} taleId - ID of the tale
 */
async function loadMoreComments(taleId) {
  if (!lastVisible || allLoaded) return;

  const button = document.getElementById('load-more-comments');

  // Loading state
  if (button) {
    button.textContent = 'Loading...';
    button.disabled = true;
  }

  // Comments collection reference
  const commentsRef = refs.comments(taleId);

  // Query next page after the last visible document
  const commentsQuery = query(
    commentsRef,
    orderBy('timestamp', 'desc'),
    startAfter(lastVisible),
    limit(PAGE_SIZE)
  );

  const snapshot = await getDocs(commentsQuery);

  // No more comments
  if (snapshot.empty) {
    allLoaded = true;
    button?.remove();
    return;
  }

  // Update pagination cursor
  lastVisible = snapshot.docs[snapshot.docs.length - 1];

  allLoaded = snapshot.docs.length < PAGE_SIZE;

  const list = document.getElementById('comments-list');

  if (!list) return;

  // Remove previous Load More button
  button?.remove();

  // Normalize comments
  const comments = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  // Append new comments
  list.insertAdjacentHTML('beforeend', comments.map(renderComment).join(''));

  // Re-add Load More button if additional pages exist
  if (!allLoaded) {
    list.insertAdjacentHTML('beforeend', renderLoadMoreButton());

    document.getElementById('load-more-comments')?.addEventListener('click', () => {
      loadMoreComments(currentTaleId);
    });
  }
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

  // Ignore empty comments or unauthenticated users
  if (!text || !auth.currentUser) return;

  // Comments collection reference
  const commentsRef = refs.comments(taleId);

  await addDoc(commentsRef, {
    text,
    authorId: auth.currentUser.uid,
    authorName: auth.currentUser.displayName || 'Anonymous Scribe',
    timestamp: serverTimestamp(),
  });

  // Clear input after successful post
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
 * Returns the Load More button HTML string.
 *
 * @returns {string} HTML string for the Load More button
 */
function renderLoadMoreButton() {
  return `
    <div class="text-center pt-8">
      <button
        id="load-more-comments"
        class="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
      >
        Load More Echoes
      </button>
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
