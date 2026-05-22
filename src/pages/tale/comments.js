// src/pages/tale/comments.js
// High-fidelity neural echo (comments) system with robust pagination.

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
import { showToast } from '@ui/components/toast.js';
import { escapeHtml } from '@/utils/string.utils';
import { initIcons } from '@ui/components/icons.js';

const PAGE_SIZE = 10;
let lastVisible = null;
let allLoaded = false;
let currentTaleId = null;
let isFetching = false;

/**
 * Initialises the comment section.
 * Fetches the first page and sets up a listener for real-time NEW comments.
 */
export async function listenToComments(taleId) {
  currentTaleId = taleId;
  const list = document.getElementById('comments-list');
  if (!list) return;

  // Initial load
  await _fetchComments(true);
}

/**
 * Core fetch logic for pagination.
 */
async function _fetchComments(isInitial = false) {
  if (isFetching || (allLoaded && !isInitial)) return;
  isFetching = true;

  const list = document.getElementById('comments-list');
  if (isInitial) {
    list.innerHTML = `<div class="py-10 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-700">Synchronising Echoes...</div>`;
  }

  try {
    const q = isInitial
      ? query(refs.comments(currentTaleId), orderBy('timestamp', 'desc'), limit(PAGE_SIZE))
      : query(
          refs.comments(currentTaleId),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );

    const snap = await getDocs(q);

    if (isInitial) list.innerHTML = ''; // Clear loader

    if (snap.empty && isInitial) {
      list.innerHTML = `<p class="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] text-center py-20">The echoes remain silent.</p>`;
      isFetching = false;
      return;
    }

    lastVisible = snap.docs[snap.docs.length - 1];
    allLoaded = snap.docs.length < PAGE_SIZE;

    const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Remove existing load more button before appending
    document.getElementById('load-more-btn-container')?.remove();

    const html = comments.map(_renderComment).join('');
    list.insertAdjacentHTML('beforeend', html);

    if (!allLoaded) {
      list.insertAdjacentHTML(
        'beforeend',
        `
        <div id="load-more-btn-container" class="text-center pt-10">
          <button id="load-more-btn" class="px-8 py-3.5 glass-strong rounded-xl text-[9px] font-black uppercase tracking-[0.4em] text-indigo-300 hover:text-white transition-all">
            Retrieve More Echoes
          </button>
        </div>
      `
      );
      document
        .getElementById('load-more-btn')
        ?.addEventListener('click', () => _fetchComments(false));
    }

    initIcons();
  } catch (err) {
    console.error('[echoes] Fetch failed:', err);
  } finally {
    isFetching = false;
  }
}

export async function postComment(taleId) {
  const input = document.getElementById('comment-text');
  const text = input?.value.trim();
  if (!text || !auth.currentUser) return;

  const btn = document.getElementById('post-btn');
  btn.disabled = true;
  const originalText = btn.innerText;
  btn.innerText = 'Transmitting...';

  try {
    await addDoc(refs.comments(taleId), {
      text,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || 'Anonymous Scribe',
      timestamp: serverTimestamp(),
    });
    input.value = '';
    showToast('Echo transmitted to the weave.', 'success');
    // Refresh to show new comment at top
    _fetchComments(true);
  } catch (err) {
    console.error('Transmission failed:', err);
    showToast('Transmission failed. Neural link unstable.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}

function _renderComment(c) {
  const date = c.timestamp ? new Date(c.timestamp.seconds * 1000).toLocaleDateString() : 'Just now';
  const seed = encodeURIComponent((c.authorId || 'scribe').slice(0, 8));

  return `
    <div class="glass-card p-6 md:p-8 rounded-[2rem] border-l-4 border-indigo-500/40 animate-fade-in mb-6 last:mb-0">
      <div class="flex justify-between items-start mb-5">
        <div class="flex items-center gap-3">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}" 
            alt="${escapeHtml(c.authorName)}" 
            class="w-8 h-8 rounded-lg bg-white/5" 
            loading="lazy" />
          <div>
            <p class="text-[10px] font-black text-white uppercase tracking-widest">${escapeHtml(c.authorName)}</p>
            <p class="text-[8px] text-slate-500 font-bold uppercase mt-0.5">${date}</p>
          </div>
        </div>
      </div>
      <p class="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
        ${escapeHtml(c.text)}
      </p>
    </div>
  `;
}
