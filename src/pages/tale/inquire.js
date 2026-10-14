// src/pages/tale/inquire.js
// Chronicle Missives: Two-way correspondence between readers and authors.
// - Author View: Inbound missives desk with Reply, Report, and Block options.
// - Reader View: Inquire of the Scribe form + list of dispatched inquiries and replies received.

import { createLogger, escapeHtml } from '@/utils';
import { auth, refs, addDoc, updateDoc, serverTimestamp } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/components/icons.js';
import { getAuthorStatus } from '@services/author.service.js';
import { formatCommentDateTime, getAuthorInitials } from './comments.js';

const log = createLogger('ChroniclerMissives');

const INQUIRE_COOLDOWN_MS = 4000;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 800;

/* ─────────────────────────────────────────────
   Storage Helpers
   ───────────────────────────────────────────── */

export function getStoredInquiries(taleId) {
  try {
    return JSON.parse(localStorage.getItem(`tt_inquiries_${taleId}`) || '[]');
  } catch (err) {
    log.error('Failed to parse stored inquiries', err);
    return [];
  }
}

export function saveStoredInquiries(taleId, inquiries) {
  try {
    localStorage.setItem(`tt_inquiries_${taleId}`, JSON.stringify(inquiries.slice(0, 100)));
  } catch (err) {
    log.error('Failed to save inquiries to local storage', err);
  }
}

export function getBlockedSenders(taleId) {
  try {
    const list = JSON.parse(localStorage.getItem(`tt_blocked_senders_${taleId}`) || '[]');
    return new Set(list.map((s) => String(s).toLowerCase()));
  } catch {
    return new Set();
  }
}

export function saveBlockedSender(taleId, identifier) {
  if (!identifier) return;
  const set = getBlockedSenders(taleId);
  set.add(String(identifier).toLowerCase());
  try {
    localStorage.setItem(`tt_blocked_senders_${taleId}`, JSON.stringify(Array.from(set)));
  } catch (err) {
    log.error('Failed to save blocked sender', err);
  }
}

/* ─────────────────────────────────────────────
   Author Operations
   ───────────────────────────────────────────── */

/**
 * Replies to a reader missive.
 *
 * @param {string} taleId
 * @param {string|number} inquiryId
 * @param {string} replyText
 * @param {string} authorName
 */
export async function replyToMissive(taleId, inquiryId, replyText, authorName = 'The Scribe') {
  const inquiries = getStoredInquiries(taleId);
  const target = inquiries.find((i) => String(i.id) === String(inquiryId));
  const now = new Date().toISOString();

  if (target) {
    target.status = 'replied';
    target.replyText = replyText;
    target.replyAuthorName = authorName;
    target.repliedAt = now;
    saveStoredInquiries(taleId, inquiries);
  }

  // Update in Firestore if doc exists
  try {
    if (refs.inquiry && typeof inquiryId === 'string' && inquiryId.length > 5) {
      await updateDoc(refs.inquiry(inquiryId), {
        status: 'replied',
        replyText,
        replyAuthorName: authorName,
        repliedAt: serverTimestamp ? serverTimestamp() : now,
      });
    }
  } catch (err) {
    log.debug('Could not update inquiry in Firestore:', err);
  }

  return target;
}

/**
 * Reports an inappropriate reader missive to archivists.
 *
 * @param {string} taleId
 * @param {string|number} inquiryId
 */
export async function reportMissive(taleId, inquiryId) {
  const inquiries = getStoredInquiries(taleId);
  const target = inquiries.find((i) => String(i.id) === String(inquiryId));

  if (target) {
    target.status = 'reported';
    target.isReported = true;
    saveStoredInquiries(taleId, inquiries);
  }

  try {
    if (refs.inquiry && typeof inquiryId === 'string' && inquiryId.length > 5) {
      await updateDoc(refs.inquiry(inquiryId), {
        status: 'reported',
        isReported: true,
      });
    }
  } catch (err) {
    log.debug('Could not report inquiry in Firestore:', err);
  }

  return target;
}

/**
 * Blocks a reader from dispatching further missives for this chronicle.
 *
 * @param {string} taleId
 * @param {string|number} inquiryId
 * @param {string} moniker
 * @param {string} senderId
 */
export async function blockSender(taleId, inquiryId, moniker, senderId) {
  if (moniker) saveBlockedSender(taleId, moniker);
  if (senderId && senderId !== 'anonymous') saveBlockedSender(taleId, senderId);

  const inquiries = getStoredInquiries(taleId);
  const target = inquiries.find((i) => String(i.id) === String(inquiryId));

  if (target) {
    target.status = 'blocked';
    target.isBlocked = true;
    saveStoredInquiries(taleId, inquiries);
  }

  try {
    if (refs.inquiry && typeof inquiryId === 'string' && inquiryId.length > 5) {
      await updateDoc(refs.inquiry(inquiryId), {
        status: 'blocked',
        isBlocked: true,
      });
    }
  } catch (err) {
    log.debug('Could not block sender in Firestore:', err);
  }

  return target;
}

/* ─────────────────────────────────────────────
   Author Mailroom Rendering
   ───────────────────────────────────────────── */

function _renderAuthorMissiveCard(m, _taleId, _authorName) {
  const senderName = m.senderMoniker || 'Reader';
  const initials = getAuthorInitials(senderName);
  const dateStr = formatCommentDateTime(m.createdAt || m.timestamp);
  const categoryLabel =
    {
      lore: 'Lore & World',
      characters: 'Character Doubts',
      plot: 'Plot & Theories',
      connect: 'Connect & Praise',
    }[m.category] || 'General Inquiry';

  let statusBadgeHtml = '';
  if (m.isBlocked) {
    statusBadgeHtml = `<span class="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">Blocked</span>`;
  } else if (m.isReported) {
    statusBadgeHtml = `<span class="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[9px] font-bold uppercase tracking-wider">Reported</span>`;
  } else if (m.replyText || m.status === 'replied') {
    statusBadgeHtml = `<span class="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">Replied</span>`;
  } else {
    statusBadgeHtml = `<span class="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase tracking-wider">Pending</span>`;
  }

  const contactHtml = m.senderContact
    ? `<span class="px-2 py-0.5 rounded-md bg-white/4 border border-white/6 text-slate-300 text-[10px] font-mono">${escapeHtml(m.senderContact)}</span>`
    : '';

  const replyBubbleHtml = m.replyText
    ? `<div class="missive-reply-bubble mt-3.5 space-y-1.5 animate-fade-in">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
            <i data-lucide="corner-down-right" class="w-3.5 h-3.5"></i>
            <span>Your Transmitted Response</span>
          </div>
          <span class="text-[10px] text-slate-400">${formatCommentDateTime(m.repliedAt)}</span>
        </div>
        <p class="text-xs text-slate-200 leading-relaxed font-medium">${escapeHtml(m.replyText)}</p>
      </div>`
    : '';

  const replyFormHtml = `
    <div id="author-reply-form-${m.id}" class="author-inline-reply-form hidden mt-3 p-3.5 rounded-2xl bg-black/40 border border-indigo-500/20 space-y-3">
      <textarea
        id="author-reply-input-${m.id}"
        rows="3"
        placeholder="Inscribe your response to ${escapeHtml(senderName)}…"
        class="inquire-input w-full p-3 rounded-xl text-xs resize-y min-h-20"
      >${m.replyText ? escapeHtml(m.replyText) : ''}</textarea>
      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="author-cancel-reply-btn px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider"
          data-inquiry-id="${m.id}"
        >Cancel</button>
        <button
          type="button"
          class="author-submit-reply-btn px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md"
          data-inquiry-id="${m.id}"
        >Transmit Response</button>
      </div>
    </div>`;

  return `
    <div class="missive-card animate-fade-in" id="author-missive-${m.id}" data-id="${m.id}">
      <div class="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-indigo-600 text-white shrink-0 font-serif">
            ${initials}
          </div>
          <div class="min-w-0 leading-tight">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-white truncate">${escapeHtml(senderName)}</span>
              <span class="px-2 py-0.5 rounded-md bg-white/4 border border-white/8 text-[9px] font-bold uppercase tracking-wider text-indigo-300">${categoryLabel}</span>
              ${statusBadgeHtml}
            </div>
            <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span>${dateStr}</span>
              ${contactHtml}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0" id="author-missive-actions-${m.id}">
          <button
            type="button"
            class="missive-action-btn author-reply-trigger"
            data-inquiry-id="${m.id}"
            title="Reply to missive"
          >
            <i data-lucide="reply" class="w-3.5 h-3.5"></i>
            <span>${m.replyText ? 'Edit Reply' : 'Reply'}</span>
          </button>
          <button
            type="button"
            class="missive-action-btn author-report-trigger ${m.isReported ? 'hidden' : ''}"
            data-inquiry-id="${m.id}"
            title="Report inappropriate missive"
          >
            <i data-lucide="flag" class="w-3.5 h-3.5"></i>
            <span>Report</span>
          </button>
          <button
            type="button"
            class="missive-action-btn btn-danger author-block-trigger ${m.isBlocked ? 'hidden' : ''}"
            data-inquiry-id="${m.id}"
            data-moniker="${escapeHtml(senderName)}"
            data-sender-id="${m.senderId || m.userId || ''}"
            title="Block sender"
          >
            <i data-lucide="ban" class="w-3.5 h-3.5"></i>
            <span>Block</span>
          </button>
        </div>
      </div>

      <div class="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
        ${escapeHtml(m.message)}
      </div>

      ${replyBubbleHtml}
      ${replyFormHtml}
    </div>`;
}

function _renderAuthorMissives(taleId, authorName, activeFilter = 'all') {
  const listEl = document.getElementById('author-missives-list');
  if (!listEl) return;

  const allMissives = getStoredInquiries(taleId);
  const total = allMissives.length;
  const replied = allMissives.filter((m) => Boolean(m.replyText || m.status === 'replied')).length;
  const pending = allMissives.filter(
    (m) => !m.replyText && m.status !== 'replied' && !m.isBlocked && !m.isReported
  ).length;

  const totalEl = document.getElementById('author-stat-total');
  if (totalEl) totalEl.textContent = String(total);
  const pendingEl = document.getElementById('author-stat-pending');
  if (pendingEl) pendingEl.textContent = String(pending);
  const repliedEl = document.getElementById('author-stat-replied');
  if (repliedEl) repliedEl.textContent = String(replied);

  let filtered = allMissives;
  if (activeFilter === 'unanswered') {
    filtered = allMissives.filter(
      (m) => !m.replyText && m.status !== 'replied' && !m.isBlocked && !m.isReported
    );
  } else if (activeFilter === 'replied') {
    filtered = allMissives.filter((m) => Boolean(m.replyText || m.status === 'replied'));
  } else if (activeFilter === 'reported') {
    filtered = allMissives.filter((m) => Boolean(m.isReported));
  } else if (activeFilter === 'blocked') {
    filtered = allMissives.filter((m) => Boolean(m.isBlocked));
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-12 rounded-2xl bg-white/2 border border-white/6 text-slate-400 space-y-2">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto text-slate-500 opacity-60"></i>
        <p class="text-xs font-semibold text-slate-300">No missives match this filter.</p>
        <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Reader inquiries and missives dispatched for this chronicle will appear here.</p>
      </div>`;
    initIcons(listEl);
    return;
  }

  listEl.innerHTML = filtered.map((m) => _renderAuthorMissiveCard(m, taleId, authorName)).join('');
  initIcons(listEl);
}

function _bindAuthorMailroomEvents(taleId, authorName) {
  const container = document.getElementById('author-missives-view');
  if (!container) return;

  // Filter chips
  const filterChips = container.querySelectorAll('#author-missives-filter-chips .filter-chip');
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter || 'all';
      _renderAuthorMissives(taleId, authorName, filter);
    });
  });

  // Delegated Actions: Reply, Report, Block, Cancel, Submit
  container.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const inquiryId = target.dataset.inquiryId;

    // Toggle Reply Form
    if (target.classList.contains('author-reply-trigger') && inquiryId) {
      const form = document.getElementById(`author-reply-form-${inquiryId}`);
      if (form) {
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
          document.getElementById(`author-reply-input-${inquiryId}`)?.focus();
        }
      }
      return;
    }

    // Cancel Reply Form
    if (target.classList.contains('author-cancel-reply-btn') && inquiryId) {
      document.getElementById(`author-reply-form-${inquiryId}`)?.classList.add('hidden');
      return;
    }

    // Submit Reply
    if (target.classList.contains('author-submit-reply-btn') && inquiryId) {
      const input = document.getElementById(`author-reply-input-${inquiryId}`);
      const text = input?.value.trim();
      if (!text) {
        showToast('Please inscribe a response before transmitting.', 'warning');
        return;
      }

      await replyToMissive(taleId, inquiryId, text, authorName);
      showToast('Response transmitted to reader.', 'success');
      const activeFilter =
        container.querySelector('#author-missives-filter-chips .filter-chip.active')?.dataset
          .filter || 'all';
      _renderAuthorMissives(taleId, authorName, activeFilter);
      return;
    }

    // Report Missive
    if (target.classList.contains('author-report-trigger') && inquiryId) {
      if (
        typeof window !== 'undefined' &&
        window.confirm &&
        !window.confirm('Report this missive to archivists as inappropriate?')
      ) {
        return;
      }
      await reportMissive(taleId, inquiryId);
      showToast('Missive reported to archivists.', 'info');
      const activeFilter =
        container.querySelector('#author-missives-filter-chips .filter-chip.active')?.dataset
          .filter || 'all';
      _renderAuthorMissives(taleId, authorName, activeFilter);
      return;
    }

    // Block Sender
    if (target.classList.contains('author-block-trigger') && inquiryId) {
      const moniker = target.dataset.moniker || 'Reader';
      const senderId = target.dataset.senderId || '';
      if (
        typeof window !== 'undefined' &&
        window.confirm &&
        !window.confirm(`Block ${moniker} from dispatching further missives?`)
      ) {
        return;
      }
      await blockSender(taleId, inquiryId, moniker, senderId);
      showToast(`Sender ${moniker} blocked.`, 'warning');
      const activeFilter =
        container.querySelector('#author-missives-filter-chips .filter-chip.active')?.dataset
          .filter || 'all';
      _renderAuthorMissives(taleId, authorName, activeFilter);
      return;
    }
  });
}

/* ─────────────────────────────────────────────
   Reader Dispatched Inquiries Rendering
   ───────────────────────────────────────────── */

function _renderReaderSentInquiries(taleId, currentUserId, authorName = 'The Scribe') {
  const listEl = document.getElementById('reader-sent-inquiries-list');
  const countBadge = document.getElementById('reader-sent-count-badge');
  if (!listEl) return;

  const storedMoniker = localStorage.getItem('tt_reader_moniker') || '';
  const allMissives = getStoredInquiries(taleId);
  const myMissives = allMissives.filter(
    (m) =>
      (currentUserId && (m.userId === currentUserId || m.senderId === currentUserId)) ||
      (storedMoniker && m.senderMoniker === storedMoniker)
  );

  if (countBadge) {
    countBadge.textContent = `${myMissives.length} Dispatched`;
  }

  if (myMissives.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-8 rounded-2xl bg-white/2 border border-white/6 text-slate-400 space-y-1">
        <p class="text-xs font-semibold text-slate-300">No inquiries dispatched yet.</p>
        <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Use the form above to dispatch questions or lore doubts directly to the author.</p>
      </div>`;
    initIcons(listEl);
    return;
  }

  listEl.innerHTML = myMissives
    .map((m) => {
      const dateStr = formatCommentDateTime(m.createdAt || m.timestamp);
      const categoryLabel =
        {
          lore: 'Lore & World',
          characters: 'Character Doubts',
          plot: 'Plot & Theories',
          connect: 'Connect & Praise',
        }[m.category] || 'General Inquiry';

      const statusBadgeHtml = m.replyText
        ? `<span class="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">Response Received</span>`
        : `<span class="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase tracking-wider">Awaiting Scribe Response</span>`;

      const replyHtml = m.replyText
        ? `<div class="missive-reply-bubble mt-3 space-y-1.5 animate-fade-in">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center font-serif">
                  ${getAuthorInitials(m.replyAuthorName || authorName)}
                </div>
                <span class="text-xs font-semibold text-white">${escapeHtml(m.replyAuthorName || authorName)}</span>
              </div>
              <span class="text-[10px] text-slate-400">${formatCommentDateTime(m.repliedAt)}</span>
            </div>
            <p class="text-xs text-indigo-100 leading-relaxed font-medium">${escapeHtml(m.replyText)}</p>
          </div>`
        : '';

      return `
        <div class="missive-card animate-fade-in" id="reader-inquiry-${m.id}">
          <div class="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-white/4 border border-white/8 text-[9px] font-bold uppercase tracking-wider text-indigo-300">${categoryLabel}</span>
              ${statusBadgeHtml}
            </div>
            <span class="text-[10px] text-slate-400">${dateStr}</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">${escapeHtml(m.message)}</p>
          ${replyHtml}
        </div>`;
    })
    .join('');

  initIcons(listEl);
}

/* ─────────────────────────────────────────────
   Main Entrypoint
   ───────────────────────────────────────────── */

/**
 * Sets up Chronicle Missives dual-interface:
 * - Author Mailroom (for author)
 * - Inquire of Scribe + Dispatched Inquiries (for readers)
 *
 * @param {string} taleId
 * @param {Object} [tale]
 * @param {string} [userId]
 */
export function setupInquire(taleId, tale, userId = null) {
  log.info('Setting up Chronicle Missives system', { taleId });

  const authorId = tale?.authorId || '';
  const currentUserId = userId || auth.currentUser?.uid;
  const isAuthor = Boolean(
    currentUserId &&
    currentUserId !== 'anonymous' &&
    authorId &&
    authorId !== 'anonymous' &&
    currentUserId === authorId
  );

  const tabBtnLetter = document.getElementById('tab-btn-letter');
  const inviteCard = document.querySelector('.chronicler-invite-card');
  const authorView = document.getElementById('author-missives-view');
  const readerView = document.getElementById('reader-missives-view');

  const authorName = tale?.authorName || 'The Scribe';
  let authorEmail = tale?.authorEmail || '';

  // Ensure Tab Button is visible for both Author and Readers
  if (tabBtnLetter) {
    tabBtnLetter.classList.remove('hidden');
    tabBtnLetter.style.removeProperty('display');
  }

  // Synopsis teaser: hide for author since author doesn't need to inquire himself
  if (inviteCard) {
    inviteCard.classList.toggle('hidden', isAuthor);
  }

  // ── A. Author Mailroom View ──
  if (isAuthor) {
    if (authorView) authorView.classList.remove('hidden');
    if (readerView) readerView.classList.add('hidden');

    _renderAuthorMissives(taleId, authorName, 'all');
    _bindAuthorMailroomEvents(taleId, authorName);
    log.info('Author Mailroom initialized for scribe', { authorId });
    return;
  }

  // ── B. Reader Missives View ──
  if (authorView) authorView.classList.add('hidden');
  if (readerView) readerView.classList.remove('hidden');

  // 1. Hydrate Author Profile & Target Displays
  const authorDisplay = document.getElementById('inquire-author-display');
  if (authorDisplay) authorDisplay.textContent = authorName;

  const successAuthor = document.getElementById('success-author-target');
  if (successAuthor) successAuthor.textContent = authorName;

  const letterAuthorName = document.getElementById('letter-author-name');
  if (letterAuthorName) letterAuthorName.textContent = authorName;

  const letterAuthorBio = document.getElementById('letter-author-bio');
  if (letterAuthorBio) {
    letterAuthorBio.textContent =
      tale?.authorBio ||
      `Keeper of the chronicle archives and author of "${tale?.title || 'this chronicle'}".`;
  }

  const letterAuthorAvatar = document.getElementById('letter-author-avatar');
  if (letterAuthorAvatar) {
    const seed = encodeURIComponent((authorId || 'scribe').slice(0, 8));
    letterAuthorAvatar.src =
      tale?.authorAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    letterAuthorAvatar.alt = authorName;
  }

  const profileLink = document.getElementById('letter-author-profile-link');
  if (profileLink) {
    profileLink.href = authorId
      ? `/profile.html?uid=${encodeURIComponent(authorId)}`
      : '/library.html';
  }

  // 1b. Hydrate Author Correspondence Email Displays
  const updateAuthorEmailUI = (email) => {
    if (!email) return;
    const emailPill = document.getElementById('inquire-author-email-pill');
    const emailTarget = document.getElementById('inquire-author-email-target');
    const emailRow = document.getElementById('letter-author-email-row');
    const emailDisplay = document.getElementById('letter-author-email-display');
    const emailBtn = document.getElementById('letter-author-email-btn');

    if (emailPill && emailTarget) {
      emailTarget.textContent = email;
      emailPill.classList.remove('hidden');
    }
    if (emailRow && emailDisplay) {
      emailDisplay.textContent = email;
      emailRow.classList.remove('hidden');
    }
    if (emailBtn) {
      const subject = encodeURIComponent(`Missive regarding "${tale?.title || 'your chronicle'}"`);
      emailBtn.href = `mailto:${encodeURIComponent(email)}?subject=${subject}`;
      emailBtn.classList.remove('hidden');
    }
    initIcons();
  };

  if (authorEmail) {
    updateAuthorEmailUI(authorEmail);
  } else if (authorId) {
    getAuthorStatus(authorId)
      .then((status) => {
        if (status?.authorEmail) {
          authorEmail = status.authorEmail;
          updateAuthorEmailUI(authorEmail);
        }
      })
      .catch((err) => {
        log.debug('Could not fetch author registration status', err);
      });
  }

  // 2. Pre-fill reader moniker & contact if available
  const senderNameInput = document.getElementById('inquire-sender-name');
  const senderContactInput = document.getElementById('inquire-sender-contact');
  const messageInput = document.getElementById('inquire-message');
  const charCounter = document.getElementById('inquire-char-counter');
  const formError = document.getElementById('inquire-form-error');
  const categoryInput = document.getElementById('inquire-category');
  const form = document.getElementById('chronicler-inquire-form');
  const successContainer = document.getElementById('chronicler-inquire-success');
  const submitBtn = document.getElementById('inquire-submit-btn');
  const submitText = document.getElementById('inquire-submit-text');
  const inquireAnotherBtn = document.getElementById('btn-inquire-another');
  const openTeaserBtn = document.getElementById('btn-open-chronicler-letter');
  const quickBookmarkBtn = document.getElementById('letter-shelf-quick-btn');

  if (senderNameInput && !senderNameInput.value) {
    const storedMoniker = localStorage.getItem('tt_reader_moniker');
    const authDisplayName = auth.currentUser?.displayName;
    if (authDisplayName) {
      senderNameInput.value = authDisplayName;
    } else if (storedMoniker) {
      senderNameInput.value = storedMoniker;
    }
  }

  if (senderContactInput && !senderContactInput.value) {
    const authEmail = auth.currentUser?.email;
    if (authEmail) {
      senderContactInput.value = authEmail;
    }
  }

  // 3. Category Selector Chips
  const categoryChips = document.querySelectorAll('.inquiry-category-chip');
  categoryChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.category || 'lore';
      if (categoryInput) categoryInput.value = cat;

      categoryChips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
    });
  });

  // 4. Character Counter & Dynamic Validation Feedback
  if (messageInput && charCounter) {
    messageInput.addEventListener('input', () => {
      const len = messageInput.value.length;
      charCounter.textContent = `${len} / ${MAX_MESSAGE_LENGTH}`;
      if (formError && !formError.classList.contains('hidden')) {
        formError.classList.add('hidden');
        formError.textContent = '';
      }
    });
  }

  // 5. Open Missive from Synopsis Teaser
  if (openTeaserBtn) {
    openTeaserBtn.addEventListener('click', () => {
      const tabBtn = document.querySelector('[data-tab="letter"]');
      if (tabBtn) {
        tabBtn.click();
        const contentLetter = document.getElementById('content-letter');
        if (contentLetter) {
          contentLetter.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        messageInput?.focus();
      }
    });
  }

  // 6. Quick Bookmark Button in Author Card
  if (quickBookmarkBtn) {
    quickBookmarkBtn.addEventListener('click', () => {
      const shelfBtn =
        document.getElementById('shelf-btn-desktop') || document.getElementById('shelf-btn');
      if (shelfBtn) {
        shelfBtn.click();
      } else {
        showToast('Tale saved to your shelf.', 'success');
      }
    });
  }

  // 7. Reset / Inscribe Another Button
  if (inquireAnotherBtn) {
    inquireAnotherBtn.addEventListener('click', () => {
      if (messageInput) {
        messageInput.value = '';
      }
      if (charCounter) {
        charCounter.textContent = `0 / ${MAX_MESSAGE_LENGTH}`;
      }
      if (form) form.classList.remove('hidden');
      if (successContainer) successContainer.classList.add('hidden');
      messageInput?.focus();
    });
  }

  // 8. Render Reader's Sent Inquiries
  _renderReaderSentInquiries(taleId, currentUserId, authorName);

  // 9. Form Submission Handling
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const moniker = senderNameInput?.value.trim() || '';
      const contact = senderContactInput?.value.trim() || '';
      const message = messageInput?.value.trim() || '';
      const category = categoryInput?.value || 'lore';

      // Check if blocked by author
      const blockedSet = getBlockedSenders(taleId);
      if (
        blockedSet.has(moniker.toLowerCase()) ||
        (currentUserId && blockedSet.has(currentUserId.toLowerCase()))
      ) {
        if (formError) {
          formError.textContent =
            'You have been blocked from dispatching missives to this chronicler.';
          formError.classList.remove('hidden');
        }
        showToast('Unable to dispatch missive: sender blocked.', 'error');
        return;
      }

      if (moniker.length < 2) {
        if (formError) {
          formError.textContent = 'Please enter your reader moniker (at least 2 characters).';
          formError.classList.remove('hidden');
        }
        senderNameInput?.focus();
        return;
      }

      if (message.length < MIN_MESSAGE_LENGTH) {
        if (formError) {
          formError.textContent = `Your missive must be at least ${MIN_MESSAGE_LENGTH} characters long.`;
          formError.classList.remove('hidden');
        }
        messageInput?.focus();
        return;
      }

      // Rate limit check
      const cooldownKey = `tt_inquire_cooldown_${taleId}`;
      const lastSent = Number(sessionStorage.getItem(cooldownKey) || 0);
      if (Date.now() - lastSent < INQUIRE_COOLDOWN_MS) {
        showToast('Please wait a moment before dispatching another missive.', 'info');
        return;
      }

      // UI pending state
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Dispatching...';

      try {
        localStorage.setItem('tt_reader_moniker', moniker);

        const newInquiry = {
          id: Date.now(),
          taleId,
          userId: currentUserId || auth.currentUser?.uid || 'anonymous',
          senderId: currentUserId || auth.currentUser?.uid || 'anonymous',
          authorId,
          authorName,
          authorEmail: authorEmail || '',
          category,
          moniker,
          senderMoniker: moniker,
          contact,
          senderContact: contact,
          message,
          status: 'sent',
          replyText: null,
          replyAuthorName: null,
          repliedAt: null,
          isReported: false,
          isBlocked: false,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        // Store dispatched inquiry locally in archive missives
        const existing = getStoredInquiries(taleId);
        existing.unshift(newInquiry);
        saveStoredInquiries(taleId, existing);
        sessionStorage.setItem(cooldownKey, String(Date.now()));

        // Persist to Firestore archive inquiries collection (non-blocking)
        const senderId = currentUserId || auth.currentUser?.uid || 'anonymous';
        if (auth.currentUser) {
          try {
            if (refs.inquiries) {
              await addDoc(refs.inquiries(), {
                taleId,
                authorId: authorId || '',
                senderId,
                senderMoniker: moniker,
                senderContact: contact,
                category,
                message,
                status: 'sent',
                createdAt: serverTimestamp ? serverTimestamp() : new Date(),
              });
            }
          } catch (dbErr) {
            log.debug('Could not persist missive to Firestore archive:', dbErr);
          }
        }

        log.info('Missive dispatched successfully', { taleId, category, moniker });
        showToast('Your missive has been dispatched to the scribe!', 'success');

        // Show confirmation view and refresh sent inquiries list
        form.classList.add('hidden');
        if (successContainer) successContainer.classList.remove('hidden');
        _renderReaderSentInquiries(taleId, currentUserId, authorName);
        initIcons();
      } catch (err) {
        log.error('Failed to dispatch inquiry', err);
        showToast('Failed to dispatch missive. Please try again.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Dispatch Missive';
      }
    });
  }
}
