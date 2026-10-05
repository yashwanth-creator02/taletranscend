// src/pages/reader/templates.js
// UI Templates for the Reader Panels
import { THEMES } from './state.js';
import { escapeText as escapeHtml } from '@/utils';

export function renderTocPanel(chapters, currentChapterId, progress, activeSection, articleTitle) {
  const safeArticleTitle = escapeHtml(articleTitle);
  return `
    <div class="space-y-2">
      <div class="glass mb-3 rounded-xl p-3">
        <div class="mb-2 flex items-center justify-between text-xs uppercase tracking-wide" style="color:var(--reader-muted)">
          <span>Reading progress</span><span class="tabular-nums">${Math.round(progress)}%</span>
        </div>
        <div style="height:6px;overflow:hidden;border-radius:9999px;background:var(--reader-border-subtle)">
          <div class="progress-bar" style="height:100%;width:${progress}%"></div>
        </div>
      </div>
      <div class="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide" style="color:var(--reader-muted)">
        <i data-lucide="book" style="width:12px;height:12px"></i>
        <span>${safeArticleTitle}</span>
      </div>
      <div class="space-y-1">
        ${chapters
          .map((c) => {
            const isCurrent = c.id === currentChapterId;
            const safeTitle = escapeHtml(c.title);
            return `
          <div class="toc-chapter ${isCurrent ? 'current' : ''}">
            <button class="toc-chapter-btn" data-chapter-id="${c.id}">
              <span class="toc-number ${isCurrent ? 'current' : ''}" style="${isCurrent ? 'box-shadow:0 0 14px -2px rgb(var(--reader-accent-rgb) / 0.6)' : ''}">${c.number}</span>
              <span class="flex-1">
                <span class="rune-text block text-sm" style="color:var(--reader-fg)">${safeTitle}</span>
                <span class="block text-xs" style="color:var(--reader-muted)">${c.wordCount?.toLocaleString() || 0} words &middot; ${Math.max(1, Math.round((c.wordCount || 0) / 230))} min</span>
              </span>
              <i data-lucide="chevron-down" class="shrink-0" style="width:14px;height:14px;color:var(--reader-muted);transition:transform 200ms;${isCurrent ? 'transform:rotate(180deg)' : ''}"></i>
            </button>
            ${
              isCurrent && c.sections
                ? `
              <div class="toc-sections">
                ${c.sections
                  .map((s) => {
                    const active = activeSection === s.id;
                    const safeSectionTitle = escapeHtml(s.title);
                    return `
                  <button class="toc-section-btn ${active ? 'active' : ''} ${s.level === 3 ? 'pl-7' : ''}" data-section-id="${s.id}">
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
        <div class="highlight-card group">
          <div class="highlight-text highlight-${h.color}">"${safeText}"</div>
          ${
            h.note
              ? `
            <div class="mb-2 flex items-start gap-2 text-xs" style="color:var(--reader-secondary)">
              <i data-lucide="edit-3" class="mt-0.5 shrink-0" style="width:14px;height:14px;color:var(--reader-accent)"></i>
              <span>${safeNote}</span>
            </div>`
              : ''
          }
          <div class="flex items-center justify-between text-xs" style="color:var(--reader-muted)">
            <span>${h.at ? new Date(h.at).toLocaleDateString() : 'Just now'}</span>
            <button class="opacity-0 transition-opacity hover-text-red group-hover-opacity-100" data-rm-hl="${h.id}">Remove</button>
          </div>
        </div>`;
        })
        .join('')}
    </div>`;
}

export function renderCommentsPanel(comments, newComment) {
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
                  const safeAuthor = escapeHtml(c.author || 'Anonymous');
                  const safeBody = escapeHtml(c.body);
                  const safeInitials = escapeHtml(c.initials || '??');
                  return `
          <div class="comment-card">
            <div class="mb-2 flex items-center gap-2">
              <div style="display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--reader-accent-contrast);width:28px;height:28px;font-size:11px;background:var(--reader-accent);box-shadow:0 0 18px -6px rgb(var(--reader-accent-rgb) / 0.55);font-family:var(--font-serif);letter-spacing:0.08em">${safeInitials}</div>
              <div class="leading-tight">
                <div class="text-sm" style="color:var(--reader-fg)">${safeAuthor}</div>
                <div class="text-xs" style="color:var(--reader-muted)">${c.at ? new Date(c.at).toLocaleDateString() : 'Recently'}</div>
              </div>
            </div>
            <p class="text-sm leading-relaxed" style="color:var(--reader-secondary)">${safeBody}</p>
            <div class="mt-2 flex items-center gap-3 text-xs" style="color:var(--reader-muted)">
              <button class="hover-text-violet">Reply</button>
              <button class="flex items-center gap-1 hover-text-orange"><i data-lucide="heart" style="width:12px;height:12px"></i> ${c.likes || 0}</button>
            </div>
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
  return `
    <div class="space-y-4 text-sm">
      <div class="stat-row"><span class="stat-label">Reading time</span><span class="reader-stat-value">${state.estimatedReadMins} min</span></div>
      <div class="stat-row"><span class="stat-label">Word count</span><span class="reader-stat-value">${state.wordCount?.toLocaleString() || 0}</span></div>
      <div class="stat-row"><span class="stat-label">Progress</span><span class="reader-stat-value">${Math.round(state.progress || 0)} %</span></div>
      <div class="stat-row"><span class="stat-label">Era</span><span class="reader-stat-value">${state.era || 'Unknown'}</span></div>
      <div class="stat-row"><span class="stat-label">Language</span><span class="reader-stat-value">${state.language || 'English'}</span></div>
      <div class="mt-6 rounded-xl border p-3 text-xs leading-relaxed" style="background:var(--reader-card-bg);border-color:var(--reader-border);color:var(--reader-muted)">Reader v1.0 &mdash; built for slow reading.</div>
    </div>`;
}
