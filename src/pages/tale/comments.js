// src/pages/tale/comments.js
// High-fidelity neural echo (comments) system with threaded replies and pagination.

import {
  auth,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  refs,
  collection,
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
 */
export async function listenToComments(taleId) {
  currentTaleId = taleId;
  const list = document.getElementById('comments-list');
  if (!list) return;

  // Bind delegation for dynamic buttons (reply, submit reply, cancel)
  _bindDelegatedEvents(list);

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
    lastVisible = null;
    allLoaded = false;
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

    // Initial fetch of replies for the newly loaded page
    comments.forEach((c) => _fetchReplies(c.id));

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

    initIcons(list);
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
    <div class="glass-card p-6 md:p-8 rounded-[2rem] border-l-4 border-indigo-500/40 animate-fade-in mb-6 last:mb-0" id="comment-${c.id}">
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
        <button class="reply-trigger group flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-all" data-comment-id="${c.id}">
           <i data-lucide="message-square-plus" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
           Echo Back
        </button>
      </div>
      <p class="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
        ${escapeHtml(c.text)}
      </p>

      <!-- Replies Container -->
      <div id="replies-${c.id}" class="mt-8 space-y-4 border-l border-white/5 pl-6 empty:hidden"></div>
      
      <!-- Reply Form (Hidden by default) -->
      <div id="reply-form-${c.id}" class="hidden mt-8 pt-6 border-t border-white/[0.03]">
         <div class="relative">
            <textarea id="reply-text-${c.id}" placeholder="Respond to the echo…" class="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs text-white placeholder:text-slate-800 focus:outline-none focus:border-indigo-500/30 resize-none min-h-[80px]"></textarea>
            <div class="flex justify-end gap-3 mt-3">
               <button class="cancel-reply py-2 px-4 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-white" data-comment-id="${c.id}">Cancel</button>
               <button class="submit-reply py-2 px-6 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500/20" data-comment-id="${c.id}">Transmit</button>
            </div>
         </div>
      </div>
    </div>
  `;
}

async function _fetchReplies(commentId) {
  const container = document.getElementById(`replies-${commentId}`);
  if (!container) return;

  try {
    const q = query(
      collection(refs.comments(currentTaleId), commentId, 'replies'),
      orderBy('timestamp', 'asc'),
      limit(20)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    container.innerHTML = snap.docs.map((d) => _renderReply(d.data())).join('');
    initIcons(container);
  } catch (err) {
    console.error('[replies] Fetch failed:', err);
  }
}

function _renderReply(r) {
  const date = r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleDateString() : 'Just now';
  const seed = encodeURIComponent((r.authorId || 'scribe').slice(0, 8));

  return `
    <div class="flex gap-4 animate-fade-in">
       <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}" alt="Scribe" class="w-6 h-6 rounded-md bg-white/5 opacity-60" />
       <div class="flex-1">
          <div class="flex items-center gap-2 mb-1.5">
             <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">${escapeHtml(r.authorName)}</span>
             <span class="text-[7px] text-slate-600 font-bold uppercase">${date}</span>
          </div>
          <p class="text-xs text-slate-500 leading-relaxed font-medium">${escapeHtml(r.text)}</p>
       </div>
    </div>
  `;
}

function _bindDelegatedEvents(list) {
  list.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const commentId = target.dataset.commentId;
    if (!commentId) return;

    if (target.classList.contains('reply-trigger')) {
      document.getElementById(`reply-form-${commentId}`)?.classList.remove('hidden');
      document.getElementById(`reply-text-${commentId}`)?.focus();
    }

    if (target.classList.contains('cancel-reply')) {
      document.getElementById(`reply-form-${commentId}`)?.classList.add('hidden');
    }

    if (target.classList.contains('submit-reply')) {
      await _handlePostReply(commentId, target);
    }
  });
}

async function _handlePostReply(commentId, btn) {
  const input = document.getElementById(`reply-text-${commentId}`);
  const text = input?.value.trim();
  if (!text || !auth.currentUser) return;

  btn.disabled = true;
  const originalText = btn.innerText;
  btn.innerText = '...';

  try {
    const repliesRef = collection(refs.comments(currentTaleId), commentId, 'replies');
    await addDoc(repliesRef, {
      text,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || 'Anonymous Scribe',
      timestamp: serverTimestamp(),
    });

    input.value = '';
    document.getElementById(`reply-form-${commentId}`)?.classList.add('hidden');
    showToast('Echo back recorded.', 'success');
    _fetchReplies(commentId);
  } catch (err) {
    console.error('Reply failed:', err);
    showToast('Failed to echo back.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}
