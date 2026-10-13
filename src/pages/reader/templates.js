// src/pages/reader/templates.js
// UI Templates for the Reader Panels
import { THEMES, readerState } from './state.js';
import { getChapterProgress } from '@services/index.js';
import { escapeText as escapeHtml } from '@/utils';

export function renderTocPanel(
  chapters,
  currentChapterId,
  progress,
  activeSection,
  articleTitle,
  { userId, taleId, bookmarkedChapterIndex } = {}
) {
  const safeArticleTitle = escapeHtml(articleTitle);
  const activeUserId = userId || readerState?.userId;
  const activeTaleId = taleId || readerState?.taleId;

  return `
    <div class="space-y-2">
      <div class="glass mb-3 rounded-xl p-3">
        <div class="mb-2 flex items-center justify-between text-xs uppercase tracking-wide" style="color:var(--reader-muted)">
          <span>Reading progress</span><span class="tabular-nums">${Math.round(progress)}%</span>
        </div>
        <div style="height:6px;overflow:hidden;border-radius:3px;background:var(--reader-border-subtle)">
          <div class="progress-bar" style="height:100%;width:${progress}%"></div>
        </div>
      </div>
      <div class="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide" style="color:var(--reader-muted)">
        <i data-lucide="book" style="width:12px;height:12px"></i>
        <span>${safeArticleTitle}</span>
      </div>
      <div class="space-y-1">
        ${chapters
          .map((c, idx) => {
            const isCurrent = c.id === currentChapterId;
            const safeTitle = escapeHtml(c.title);
            const chapterIndex = typeof c.number === 'number' ? c.number - 1 : idx;
            const chProgress =
              activeUserId && activeTaleId
                ? getChapterProgress({ userId: activeUserId, taleId: activeTaleId, chapterIndex })
                : null;
            const isCompleted = chProgress?.scrollPercent >= 95;
            const isBookmarked =
              typeof bookmarkedChapterIndex === 'number' && chapterIndex === bookmarkedChapterIndex;

            return `
          <div class="toc-chapter ${isCurrent ? 'current' : ''}">
            <div class="toc-chapter-header">
              <button class="toc-chapter-btn" data-chapter-id="${c.id}" type="button">
                <span class="toc-number ${isCurrent ? 'current' : ''}" style="${isCurrent ? 'box-shadow:0 0 14px -2px rgb(var(--reader-accent-rgb) / 0.6)' : ''}">${c.number}</span>
                <span class="flex-1 min-w-0">
                  <span class="rune-text block text-sm truncate" style="color:var(--reader-fg)">${safeTitle}</span>
                  <span class="block text-xs" style="color:var(--reader-muted)">
                    ${c.wordCount?.toLocaleString() || 0} words &middot; ${Math.max(1, Math.round((c.wordCount || 0) / 230))} min
                    ${isCompleted ? ' &middot; <span class="toc-read-label" style="color:var(--reader-accent);font-weight:600">Read</span>' : ''}
                    ${isBookmarked ? ' &middot; <span class="toc-bookmark-label" style="color:var(--reader-accent);font-weight:600"><i data-lucide="bookmark" class="inline fill-current mr-0.5" style="width:10px;height:10px"></i>Bookmarked</span>' : ''}
                  </span>
                </span>
                <i data-lucide="chevron-down" class="shrink-0" style="width:14px;height:14px;color:var(--reader-muted);transition:transform 200ms;${isCurrent ? 'transform:rotate(180deg)' : ''}"></i>
              </button>
              <div class="toc-chapter-menu-wrap">
                <button
                  type="button"
                  class="toc-menu-trigger"
                  data-toc-menu-trigger="${c.id}"
                  data-chapter-index="${chapterIndex}"
                  aria-label="Options for ${safeTitle}"
                  title="Chapter options"
                >
                  <i data-lucide="more-vertical" style="width:14px;height:14px"></i>
                </button>
                <div
                  class="toc-menu-dropdown hidden"
                  id="toc-menu-${c.id}"
                  role="menu"
                >
                  <button
                    type="button"
                    class="toc-menu-item"
                    data-action="mark-read"
                    data-chapter-index="${chapterIndex}"
                    data-chapter-title="${safeTitle}"
                    role="menuitem"
                  >
                    <i data-lucide="check" style="width:13px;height:13px;color:var(--reader-accent)"></i>
                    <span>Mark Read</span>
                  </button>
                  <button
                    type="button"
                    class="toc-menu-item"
                    data-action="mark-unread"
                    data-chapter-index="${chapterIndex}"
                    data-chapter-title="${safeTitle}"
                    role="menuitem"
                  >
                    <i data-lucide="rotate-ccw" style="width:13px;height:13px;color:var(--reader-muted)"></i>
                    <span>Mark Unread</span>
                  </button>
                  <button
                    type="button"
                    class="toc-menu-item"
                    data-action="download-chapter"
                    data-chapter-index="${chapterIndex}"
                    data-chapter-title="${safeTitle}"
                    role="menuitem"
                  >
                    <i data-lucide="download" style="width:13px;height:13px;color:var(--reader-accent)"></i>
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
            ${
              isCurrent && c.sections
                ? `
              <div class="toc-sections">
                ${c.sections
                  .map((s) => {
                    const active = activeSection === s.id;
                    const safeSectionTitle = escapeHtml(s.title);
                    return `
                  <button class="toc-section-btn ${active ? 'active' : ''} ${s.level === 3 ? 'pl-7' : ''}" data-section-id="${s.id}" type="button">
                    <span class="toc-dot ${active ? 'active' : ''}" style="${active ? 'box-shadow:0 0 10px 1px rgb(var(--reader-accent-rgb) / 0.7)' : ''}"></span>
                    <span class="flex-1 text-xs leading-snug ${s.level === 2 ? 'tracking-wide' : ''}" style="${active ? 'color:var(--reader-accent);font-weight:600' : 'color:var(--reader-secondary)'}">${safeSectionTitle}</span>
                  </button>`;
                  })
                  .join('')}
              </div>`
                : ''
            }
          </div>`;
          })
          .join('')}
      </div>
    </div>`;
}

export function renderTypographyPanel(state) {
  return `
    <div class="space-y-6">
      <div>
        <div class="field-label">Font family</div>
        <div class="font-grid">
          <button class="font-btn ${state.fontFamily === 'serif' ? 'active' : ''}" data-font="serif" style="font-family: var(--font-serif)">
            <div class="text-lg">Aa</div>
            <div class="mt-1 text-xs uppercase tracking-wide" style="color:var(--reader-muted)">Cinzel</div>
          </button>
          <button class="font-btn ${state.fontFamily === 'sans' ? 'active' : ''}" data-font="sans" style="font-family: var(--font-sans)">
            <div class="text-lg">Aa</div>
            <div class="mt-1 text-xs uppercase tracking-wide" style="color:var(--reader-muted)">Inter</div>
          </button>
        </div>
      </div>
      <div>
        <div class="field-label">Font size &mdash; ${state.fontSize}px</div>
        <div class="range-row">
          <button class="range-btn" id="fs-minus"><i data-lucide="minus" style="width:16px;height:16px"></i></button>
          <input type="range" min="13" max="26" value="${state.fontSize}" id="fs-range">
          <button class="range-btn" id="fs-plus"><i data-lucide="plus" style="width:16px;height:16px"></i></button>
        </div>
      </div>
      <div>
        <div class="field-label">Line height &mdash; ${state.lineHeight.toFixed(2)}</div>
        <div class="lh-grid">
          ${[1.4, 1.6, 1.75, 2.0]
            .map(
              (v) => `
            <button class="lh-btn ${Math.abs(state.lineHeight - v) < 0.01 ? 'active' : ''}" data-lh="${v}">${v}</button>
          `
            )
            .join('')}
        </div>
      </div>
      <div>
        <div class="field-label">Line width &mdash; ${state.measure}ch</div>
        <input type="range" min="48" max="92" value="${state.measure}" id="mw-range">
        <div class="mt-1 flex justify-between text-xs" style="color:var(--reader-muted)">
          <span>Narrow</span>
          <span>Wide</span>
        </div>
      </div>
    </div>
  `;
}

export function renderThemePanel(currentTheme) {
  return `
    <div class="theme-grid">
      ${THEMES.map(
        (t) => `
        <button class="theme-btn hover-lift ${currentTheme === t.id ? 'active' : ''}" data-theme-id="${t.id}">
          <div class="theme-preview" style="background:${t.tint || 'var(--reader-accent)'};"></div>
          <div class="rune-text text-sm" style="color:var(--reader-fg)">${t.label}</div>
          <div class="text-xs" style="color:var(--reader-muted)">${t.sub || 'Theme'}</div>
          ${currentTheme === t.id ? '<span class="theme-check">&#10003;</span>' : ''}
        </button>
      `
      ).join('')}
    </div>
  `;
}

export function renderHighlightsPanel(highlights) {
  if (!highlights || highlights.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="highlighter" style="width:20px;height:20px"></i></div>
        <div class="rune-text text-sm" style="color:var(--reader-fg)">No highlights yet</div>
        <p class="mt-1 max-w-[240px] text-xs leading-relaxed" style="color:var(--reader-muted)">
          Select any text in the article and a small menu will appear. Pick a color or attach a private note.
        </p>
      </div>`;
  }
  return `
    <div class="space-y-3">
      ${highlights
        .map((h) => {
          const safeText = escapeHtml(h.text.length > 160 ? h.text.slice(0, 160) + '…' : h.text);
          const safeNote = h.note ? escapeHtml(h.note) : '';
          return `
        <div class="highlight-card group" data-highlight-item="${h.id}">
          <button type="button" class="highlight-jump-btn text-left w-full cursor-pointer focus:outline-none" data-jump-hl="${h.id}" title="Jump to highlight in story" aria-label="Jump to highlight in story">
            <div class="highlight-text highlight-${h.color}">"${safeText}"</div>
          </button>
          ${
            h.note
              ? `
            <div class="mb-2 flex items-start gap-2 text-xs" style="color:var(--reader-secondary)">
              <i data-lucide="edit-3" class="mt-0.5 shrink-0" style="width:14px;height:14px;color:var(--reader-accent)"></i>
              <span>${safeNote}</span>
            </div>`
              : ''
          }
          <div class="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.04]" style="color:var(--reader-muted)">
            <span class="text-[11px]">${h.at ? new Date(h.at).toLocaleDateString() : 'Just now'}</span>
            <div class="flex items-center gap-2">
              <button type="button" class="highlight-share-btn text-slate-400 hover:text-white transition-colors p-1" data-share-quote="${h.id}" title="Create Share Card" aria-label="Create Share Card">
                <i data-lucide="share-2" style="width:13px;height:13px"></i>
              </button>
              <button type="button" class="transition-opacity hover-text-red text-[11px]" data-rm-hl="${h.id}">Remove</button>
            </div>
          </div>
        </div>`;
        })
        .join('')}
    </div>`;
}

/**
 * Renders an editorial quote share card modal with tale cover background.
 *
 * @param {Object} params
 * @param {string} params.quote
 * @param {string} [params.taleTitle]
 * @param {string} [params.authorName]
 * @param {string} [params.coverUrl]
 * @param {number} [params.chapterNum]
 * @returns {string} HTML string
 */
export function renderQuoteCardModal({
  quote = '',
  taleTitle = 'Untitled Tale',
  authorName = 'Unknown Scribe',
  coverUrl = '',
  chapterNum = 1,
} = {}) {
  const safeQuote = escapeHtml(quote);
  const safeTitle = escapeHtml(taleTitle);
  const safeAuthor = escapeHtml(authorName);
  const coverBg = coverUrl ? `background-image: url('${coverUrl}');` : '';

  return `
    <div id="tt-quote-modal" class="quote-modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="quote-card-title">
      <div class="quote-card-dialog">
        <div class="quote-card-hero" style="${coverBg}">
          <div class="quote-card-scrim"></div>
          <div class="quote-card-content">
            <div class="quote-card-header">
              <div class="quote-card-brand">
                <div class="quote-card-crest">
                  <i data-lucide="feather" style="width:14px;height:14px"></i>
                </div>
                <span class="quote-card-brand-label">TaleTranscend Scribe</span>
              </div>
              <button type="button" class="glyph-btn quote-modal-close" style="width:28px;height:28px" aria-label="Close quote card" data-modal-close>
                <i data-lucide="x" style="width:14px;height:14px"></i>
              </button>
            </div>

            <div class="my-auto py-2">
              <div class="quote-card-quote-icon">
                <i data-lucide="quote" style="width:28px;height:28px"></i>
              </div>
              <blockquote id="quote-card-title" class="quote-card-quote-text">
                "${safeQuote}"
              </blockquote>
            </div>

            <div>
              <div class="quote-card-divider"></div>
              <div class="quote-card-attribution">
                <div class="min-w-0 flex-1">
                  <div class="quote-card-tale-title">${safeTitle}</div>
                  <div class="quote-card-author">by ${safeAuthor}</div>
                </div>
                <div class="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest text-slate-400 border border-white/[0.08] bg-white/[0.02]">
                  Fragment ${chapterNum}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="quote-card-actions">
          <button type="button" class="quote-card-btn quote-card-btn-secondary" data-modal-close>
            Close
          </button>
          <button type="button" class="quote-card-btn quote-card-btn-primary" data-copy-quote>
            <i data-lucide="copy" style="width:13px;height:13px"></i>
            <span>Copy Quote</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Formats a comment timestamp to include both date and time.
 * E.g., "Oct 12, 2026 at 11:05 PM"
 *
 * @param {number|Date} at
 * @returns {string}
 */
export function formatCommentDateTime(at) {
  if (!at) return 'Recently';
  const d = new Date(at);
  if (isNaN(d.getTime())) return 'Recently';
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Builds a hierarchical tree from a flat array of replies containing replyToId.
 *
 * @param {Array<Object>} replies
 * @returns {Array<Object>} Root replies with nested children arrays
 */
export function buildReplyTree(replies) {
  if (!Array.isArray(replies) || replies.length === 0) return [];

  const map = new Map();
  const roots = [];

  replies.forEach((r) => {
    map.set(r.id, { ...r, children: [] });
  });

  replies.forEach((r) => {
    const node = map.get(r.id);
    if (r.replyToId && map.has(r.replyToId)) {
      map.get(r.replyToId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function _renderReplyNode(r, commentId, currentUserId) {
  const isReplyOwner = Boolean(currentUserId && r.authorId && r.authorId === currentUserId);
  const safeReplyAuthor = escapeHtml(r.author || 'Anonymous');
  const safeReplyBody = escapeHtml(r.body || '');
  const safeReplyInitials = escapeHtml(r.initials || '??');
  const safeReplyToAuthor = r.replyToAuthor ? escapeHtml(r.replyToAuthor) : '';
  const isReplyDeleted = Boolean(r.isDeleted);
  const isReplyEdited = Boolean(r.isEdited) && !isReplyDeleted;

  const childrenHtml =
    r.children && r.children.length > 0
      ? `
    <div class="comment-replies-list" id="replies-list-${r.id}">
      ${r.children.map((child) => _renderReplyNode(child, commentId, currentUserId)).join('')}
    </div>`
      : '';

  return `
    <div class="comment-reply-card" id="reply-${r.id}">
      <div class="mb-1.5 flex items-center gap-2">
        <div style="display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--reader-accent-contrast);width:22px;height:22px;font-size:9px;background:var(--reader-accent);font-family:var(--font-serif)">${safeReplyInitials}</div>
        <div class="leading-tight">
          <div class="flex items-center gap-1.5 flex-wrap">
            <div class="text-xs font-semibold" style="color:var(--reader-fg)">${safeReplyAuthor}</div>
            ${safeReplyToAuthor && !isReplyDeleted ? `<span class="reply-target-tag" style="font-size:9px;padding:1px 5px;border-radius:3px;background:rgb(var(--accent-rgb)/var(--a-10));border:1px solid rgb(var(--accent-rgb)/var(--a-20));color:var(--accent-tint);font-weight:600">@${safeReplyToAuthor}</span>` : ''}
            ${r.isTaleAuthor && !isReplyDeleted ? '<span class="author-tag" style="font-size:7px;padding:1px 4px;border-radius:3px;background:rgb(var(--accent-rgb)/var(--a-16));border:1px solid rgb(var(--accent-rgb)/var(--a-40));color:rgb(var(--accent-rgb));font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Author</span>' : ''}
            ${isReplyEdited ? '<span class="edited-badge edited-tag" style="font-size:7px;padding:1px 4px;border-radius:3px;background:var(--reader-card-bg);border:1px solid var(--reader-border);color:var(--reader-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Edited</span>' : ''}
          </div>
          <div class="text-[10px]" style="color:var(--reader-muted)">${formatCommentDateTime(r.at)}</div>
        </div>
      </div>
      ${
        isReplyDeleted
          ? `<p class="text-xs italic" style="color:var(--reader-muted)">This comment has been deleted by the user.</p>`
          : `
        <p class="comment-reply-text text-xs leading-relaxed" id="reply-body-${r.id}" style="color:var(--reader-secondary)">${safeReplyBody}</p>
        ${
          isReplyOwner
            ? `
          <div class="comment-inline-form hidden" id="reply-edit-form-${r.id}">
            <textarea class="comment-textarea" id="reply-edit-input-${r.id}" rows="2">${safeReplyBody}</textarea>
            <div class="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs">
              <button type="button" class="comment-cancel-btn cancel-reply-edit-trigger" data-reply-id="${r.id}" data-comment-id="${commentId}" style="font-size:10px;padding:2px 6px">Cancel</button>
              <button type="button" class="post-btn save-reply-edit-trigger" data-reply-id="${r.id}" data-comment-id="${commentId}" style="font-size:10px;padding:2px 8px">Save</button>
            </div>
          </div>
        `
            : ''
        }
        <div class="comment-inline-form hidden mt-2" id="reply-to-reply-form-${r.id}">
          <div class="text-[10px] text-indigo-300 mb-1 flex items-center gap-1 font-semibold">
            <i data-lucide="corner-down-right" style="width:10px;height:10px"></i>
            <span>Replying to @${safeReplyAuthor}</span>
          </div>
          <textarea class="comment-textarea" id="reply-to-reply-input-${r.id}" rows="2" placeholder="Write a reply to @${safeReplyAuthor}..."></textarea>
          <div class="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs">
            <button type="button" class="comment-cancel-btn cancel-reply-to-reply-trigger" data-reply-id="${r.id}" style="font-size:10px;padding:2px 6px">Cancel</button>
            <button type="button" class="post-btn submit-reply-to-reply-trigger" data-comment-id="${commentId}" data-reply-id="${r.id}" data-reply-author="${safeReplyAuthor}" style="font-size:10px;padding:2px 8px">Reply</button>
          </div>
        </div>
        <div class="comment-actions mt-1.5 flex flex-wrap items-center gap-2 sm:gap-2.5 text-[11px]" style="color:var(--reader-muted)">
          <button type="button" class="comment-action-btn reply-like-trigger flex items-center gap-1 ${r.liked ? 'liked' : ''}" data-comment-id="${commentId}" data-reply-id="${r.id}" aria-label="Like reply" style="${r.liked ? 'color:var(--reader-accent)' : ''}">
            <i data-lucide="heart" class="${r.liked ? 'fill-current' : ''}" style="width:10px;height:10px"></i>
            <span>${r.likes || 0}</span>
          </button>
          <button type="button" class="comment-action-btn reply-to-reply-trigger flex items-center gap-1 hover-text-violet" data-comment-id="${commentId}" data-reply-id="${r.id}" data-author="${safeReplyAuthor}" aria-label="Reply to reply">
            <i data-lucide="corner-down-right" style="width:10px;height:10px"></i>
            <span>Reply</span>
          </button>
          ${
            isReplyOwner
              ? `
            <button type="button" class="comment-action-btn reply-edit-trigger flex items-center gap-1" data-reply-id="${r.id}">
              <i data-lucide="edit-3" style="width:10px;height:10px"></i>
              <span>Edit</span>
            </button>
            <button type="button" class="comment-action-btn reply-delete-trigger flex items-center gap-1 hover-text-red" data-reply-id="${r.id}" data-comment-id="${commentId}">
              <i data-lucide="trash-2" style="width:10px;height:10px"></i>
              <span>Delete</span>
            </button>
          `
              : ''
          }
        </div>
      `
      }
      ${childrenHtml}
    </div>
  `;
}

export function renderCommentsPanel(comments, newComment, currentUserId = '') {
  const safeNewComment = escapeHtml(newComment || '');
  return `
    <div class="space-y-5">
      <div class="comment-input-area">
        <textarea class="comment-textarea" id="comment-input" rows="3" placeholder="Add to the discussion…">${safeNewComment}</textarea>
        <div class="mt-2 flex items-center justify-between text-xs" style="color:var(--reader-muted)">
          <span>Markdown supported</span>
          <button class="post-btn" id="post-comment" ${!newComment?.trim() ? 'disabled' : ''}>Post</button>
        </div>
      </div>
      <div class="space-y-3">
        ${
          comments && comments.length > 0
            ? comments
                .map((c) => {
                  const isOwner = Boolean(
                    currentUserId && c.authorId && c.authorId === currentUserId
                  );
                  const safeAuthor = escapeHtml(c.author || 'Anonymous');
                  const safeBody = escapeHtml(c.body || '');
                  const safeInitials = escapeHtml(c.initials || '??');
                  const isDeleted = Boolean(c.isDeleted);
                  const isEdited = Boolean(c.isEdited) && !isDeleted;

                  const replyTree = buildReplyTree(c.replies || []);
                  const repliesHtml =
                    replyTree.length > 0
                      ? `
                    <div class="comment-replies-list" id="replies-list-${c.id}">
                      ${replyTree.map((r) => _renderReplyNode(r, c.id, currentUserId)).join('')}
                    </div>`
                      : '';

                  return `
          <div class="comment-card" id="comment-${c.id}">
            <div class="mb-2 flex items-center gap-2">
              <div style="display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--reader-accent-contrast);width:28px;height:28px;font-size:11px;background:var(--reader-accent);box-shadow:0 0 18px -6px rgb(var(--reader-accent-rgb) / 0.55);font-family:var(--font-serif);letter-spacing:0.08em">${safeInitials}</div>
              <div class="leading-tight">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <div class="text-sm font-semibold" style="color:var(--reader-fg)">${safeAuthor}</div>
                  ${c.isTaleAuthor && !isDeleted ? '<span class="author-tag" style="font-size:8px;padding:1px 5px;border-radius:4px;background:rgb(var(--accent-rgb)/var(--a-16));border:1px solid rgb(var(--accent-rgb)/var(--a-40));color:rgb(var(--accent-rgb));font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Author</span>' : ''}
                  ${isEdited ? '<span class="edited-badge edited-tag" style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--reader-card-bg);border:1px solid var(--reader-border);color:var(--reader-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Edited</span>' : ''}
                </div>
                <div class="text-xs" style="color:var(--reader-muted)">${formatCommentDateTime(c.at)}</div>
              </div>
            </div>
            ${
              isDeleted
                ? `<p class="text-sm italic" style="color:var(--reader-muted)">This comment has been deleted by the user.</p>`
                : `
              <p class="comment-body-text text-sm leading-relaxed" id="comment-body-${c.id}" style="color:var(--reader-secondary)">${safeBody}</p>
              ${
                isOwner
                  ? `
                <div class="comment-inline-form hidden" id="comment-edit-form-${c.id}">
                  <textarea class="comment-textarea" id="comment-edit-input-${c.id}" rows="3">${safeBody}</textarea>
                  <div class="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs">
                    <button type="button" class="comment-cancel-btn cancel-edit-trigger" data-comment-id="${c.id}" style="font-size:11px;padding:3px 8px">Cancel</button>
                    <button type="button" class="post-btn save-edit-trigger" data-comment-id="${c.id}" style="font-size:11px;padding:3px 10px">Save</button>
                  </div>
                </div>
              `
                  : ''
              }
              <div class="comment-actions mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs" style="color:var(--reader-muted)">
                <button type="button" class="comment-action-btn reply-trigger flex items-center gap-1 hover-text-violet" data-comment-id="${c.id}" aria-label="Reply to comment">
                  <i data-lucide="message-square" style="width:12px;height:12px"></i>
                  <span>Reply</span>
                </button>
                <button type="button" class="comment-action-btn like-trigger flex items-center gap-1 hover-text-orange ${c.liked ? 'liked' : ''}" data-comment-id="${c.id}" aria-label="Like comment" style="${c.liked ? 'color:var(--reader-accent)' : ''}">
                  <i data-lucide="heart" class="${c.liked ? 'fill-current' : ''}" style="width:12px;height:12px"></i>
                  <span class="like-count">${c.likes || 0}</span>
                </button>
                ${
                  isOwner
                    ? `
                  <button type="button" class="comment-action-btn edit-trigger flex items-center gap-1 hover-text-violet" data-comment-id="${c.id}" aria-label="Edit comment">
                    <i data-lucide="edit-3" style="width:12px;height:12px"></i>
                    <span>Edit</span>
                  </button>
                  <button type="button" class="comment-action-btn delete-trigger flex items-center gap-1 hover-text-red" data-comment-id="${c.id}" aria-label="Delete comment">
                    <i data-lucide="trash-2" style="width:12px;height:12px"></i>
                    <span>Delete</span>
                  </button>
                `
                    : ''
                }
              </div>
              <div class="comment-inline-form hidden" id="reply-form-${c.id}">
                <textarea class="comment-textarea" id="reply-input-${c.id}" rows="2" placeholder="Write a reply to ${safeAuthor}..."></textarea>
                <div class="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs">
                  <button type="button" class="comment-cancel-btn cancel-reply-trigger" data-comment-id="${c.id}" style="font-size:11px;padding:3px 8px">Cancel</button>
                  <button type="button" class="post-btn submit-reply-trigger" data-comment-id="${c.id}" style="font-size:11px;padding:3px 10px">Reply</button>
                </div>
              </div>
            `
            }
            ${repliesHtml}
          </div>`;
                })
                .join('')
            : '<div class="text-center text-xs opacity-40 py-8">No comments yet</div>'
        }
      </div>
    </div>`;
}

export function renderSharePanel() {
  const url = window.location.href;
  return `
    <div class="space-y-3">
      <div class="rounded-xl border p-3" style="background:var(--reader-card-bg);border-color:var(--reader-border)">
        <div class="mb-2 text-xs uppercase tracking-wide" style="color:var(--reader-muted)">Direct link</div>
        <div class="share-link-box">
          <i data-lucide="link" style="width:16px;height:16px;color:var(--reader-muted)"></i>
          <span class="share-link-text">${url}</span>
          <button class="copy-btn" id="copy-link">Copy</button>
        </div>
      </div>
      <div class="space-y-2">
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}" target="_blank" rel="noreferrer" class="share-link hover-lift">
          <i data-lucide="twitter" style="width:16px;height:16px;color:var(--reader-accent)"></i>
          <span>Share on Twitter / X</span>
        </a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noreferrer" class="share-link hover-lift">
          <i data-lucide="linkedin" style="width:16px;height:16px;color:var(--reader-accent)"></i>
          <span>Share on LinkedIn</span>
        </a>
      </div>
    </div>
  `;
}

export function renderTTSPanel(isPlaying, rate) {
  const supported = 'speechSynthesis' in window;
  return `
    <div class="space-y-4">
      <div class="glass rounded-xl p-4">
        <div class="mb-3 flex items-center gap-3">
          <button class="tts-play-btn" id="tts-toggle" ${!supported ? 'disabled' : ''}>
            <i data-lucide="${isPlaying ? 'pause' : 'play'}" style="width:20px;height:20px"></i>
          </button>
          <div class="leading-tight">
            <div class="text-sm" style="color:var(--reader-fg)">${isPlaying ? 'Reading aloud…' : 'Listen to this piece'}</div>
            <div class="text-xs" style="color:var(--reader-muted)">${supported ? 'Using your browser voice' : 'Not supported in this browser'}</div>
          </div>
        </div>
        <div><div class="field-label">Speed &mdash; ${rate.toFixed(2)}&times;</div><input type="range" min="0.6" max="1.8" step="0.05" value="${rate}" id="tts-rate"></div>
      </div>
      <p class="text-xs leading-relaxed" style="color:var(--reader-muted)">The audio is generated locally by your browser's voice engine — no servers, no recordings.</p>
    </div>`;
}

export function renderInfoPanel(state) {
  const authorName = state.authorName || '';
  const authorHandle = state.authorHandle || '';
  const authorBio = state.authorBio || '';
  const safeAuthor = escapeHtml(authorName || 'Unknown Scribe');
  const safeHandle = escapeHtml(authorHandle);
  const safeBio = escapeHtml(authorBio);
  const initials = authorName
    ? authorName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'A';

  const authorSection = `
      <div class="rounded-xl border p-3.5 space-y-2.5" style="background:var(--reader-card-bg);border-color:var(--reader-border)">
        <div class="text-[10px] font-bold uppercase tracking-widest" style="color:var(--reader-muted)">Author / Chronicler</div>
        <div class="flex items-center gap-3">
          <div style="display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--reader-accent-contrast);width:36px;height:36px;font-size:12px;font-weight:600;background:var(--reader-accent);box-shadow:0 0 16px -4px rgb(var(--reader-accent-rgb) / var(--a-50, 0.5));font-family:var(--font-serif);letter-spacing:0.06em;flex-shrink:0">${initials}</div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold truncate" style="color:var(--reader-fg)">${safeAuthor}</div>
            ${safeHandle ? `<div class="text-xs truncate" style="color:var(--reader-muted)">${safeHandle}</div>` : ''}
          </div>
        </div>
        ${safeBio ? `<p class="text-xs leading-relaxed" style="color:var(--reader-secondary)">${safeBio}</p>` : ''}
      </div>`;

  return `
    <div class="space-y-4 text-sm">
      ${authorSection}
      <div class="stat-row"><span class="stat-label">Reading time</span><span class="reader-stat-value">${state.estimatedReadMins || 0} min</span></div>
      <div class="stat-row"><span class="stat-label">Word count</span><span class="reader-stat-value">${state.wordCount?.toLocaleString() || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Progress</span><span class="reader-stat-value">${Math.round(state.progress || 0)} %</span></div>
      <div class="stat-row"><span class="stat-label">Era</span><span class="reader-stat-value">${state.era || 'Unknown'}</span></div>
      <div class="stat-row"><span class="stat-label">Language</span><span class="reader-stat-value">${state.language || 'English'}</span></div>
      <div class="mt-6 rounded-xl border p-3 text-xs leading-relaxed" style="background:var(--reader-card-bg);border-color:var(--reader-border);color:var(--reader-muted)">Reader v1.0 &mdash; built for slow reading.</div>
    </div>`;
}
