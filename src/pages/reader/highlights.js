// src/pages/reader/highlights.js
/**
 * Highlights Management and Quote Share Card for the Reader.
 *
 * Provides:
 * 1. DOM text-highlighting in #article-body for saved highlights.
 * 2. Smooth jump navigation to highlighted passages with focus indication.
 * 3. High-craft, editorial Quote Share Card modal.
 */

import { initIcons } from '@ui/icons.js';
import { showToast } from '@ui/components/toast.js';
import { renderQuoteCardModal } from './templates.js';

/**
 * Applies highlights to text inside the article body element.
 * Safely traverses text nodes without breaking HTML structure.
 *
 * @param {Array<{ id: string, text: string, color?: string }>} highlights
 * @param {HTMLElement} [container]
 */
export function applyDOMHighlights(
  highlights = [],
  container = document.getElementById('article-body')
) {
  if (!container) return;

  // 1. Clear any existing highlight marks safely
  const existingMarks = container.querySelectorAll('mark.reader-highlight');
  existingMarks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
  container.normalize();

  if (!highlights || highlights.length === 0) return;

  // 2. Apply each highlight
  highlights.forEach((h) => {
    if (!h || !h.text) return;
    const targetText = h.text.trim();
    if (!targetText) return;

    const color = h.color || 'yellow';

    // Attempt single-node match
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node;
    let matched = false;

    while ((node = walker.nextNode())) {
      if (
        node.parentElement &&
        (node.parentElement.tagName === 'BUTTON' ||
          node.parentElement.tagName === 'SCRIPT' ||
          node.parentElement.tagName === 'STYLE')
      ) {
        continue;
      }

      const idx = node.nodeValue.indexOf(targetText);
      if (idx !== -1) {
        const beforeNode = idx > 0 ? node.splitText(idx) : node;
        beforeNode.splitText(targetText.length);

        const mark = document.createElement('mark');
        mark.className = `reader-highlight reader-highlight--${color}`;
        mark.id = `highlight-${h.id}`;
        mark.dataset.highlightId = h.id;
        mark.dataset.color = color;
        mark.textContent = targetText;

        beforeNode.parentNode.replaceChild(mark, beforeNode);
        matched = true;
        break;
      }
    }

    // If target text spans across multiple text nodes
    if (!matched) {
      _applyMultiNodeHighlight(container, targetText, h, color);
    }
  });
}

function _applyMultiNodeHighlight(container, targetText, h, color) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let combinedText = '';
  let cur;

  while ((cur = walker.nextNode())) {
    if (
      cur.parentElement &&
      (cur.parentElement.tagName === 'BUTTON' ||
        cur.parentElement.tagName === 'SCRIPT' ||
        cur.parentElement.tagName === 'STYLE')
    ) {
      continue;
    }
    textNodes.push({
      node: cur,
      start: combinedText.length,
      end: combinedText.length + cur.nodeValue.length,
    });
    combinedText += cur.nodeValue;
  }

  const matchIdx = combinedText.indexOf(targetText);
  if (matchIdx === -1) return;

  const matchEnd = matchIdx + targetText.length;
  const overlapping = textNodes.filter((item) => item.end > matchIdx && item.start < matchEnd);

  for (let i = overlapping.length - 1; i >= 0; i--) {
    const item = overlapping[i];
    const startInNode = Math.max(0, matchIdx - item.start);
    const endInNode = Math.min(item.node.nodeValue.length, matchEnd - item.start);
    const textToWrap = item.node.nodeValue.slice(startInNode, endInNode);

    const midNode = startInNode > 0 ? item.node.splitText(startInNode) : item.node;
    if (endInNode - startInNode < midNode.nodeValue.length) {
      midNode.splitText(endInNode - startInNode);
    }

    const mark = document.createElement('mark');
    mark.className = `reader-highlight reader-highlight--${color}`;
    if (i === 0) {
      mark.id = `highlight-${h.id}`;
    }
    mark.dataset.highlightId = h.id;
    mark.dataset.color = color;
    mark.textContent = textToWrap;

    midNode.parentNode.replaceChild(mark, midNode);
  }
}

/**
 * Smoothly scrolls the reader view to the target highlight and pulses its focus indicator.
 *
 * @param {string} hlId
 * @param {Object} [options]
 * @param {HTMLElement} [options.scroller]
 * @param {Function} [options.onClosePanel]
 * @returns {boolean}
 */
export function jumpToHighlight(
  hlId,
  { scroller = document.getElementById('scroller'), onClosePanel = null } = {}
) {
  const target = document.getElementById(`highlight-${hlId}`);
  if (!target) {
    showToast('Highlight not found in this fragment.', 'info');
    return false;
  }

  if (scroller) {
    const targetRect = target.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const top = targetRect.top - scrollerRect.top + scroller.scrollTop - 64;

    scroller.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth',
    });
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  target.classList.remove('highlight-focused');
  // Trigger DOM reflow to restart animation reliably
  void target.offsetWidth;
  target.classList.add('highlight-focused');
  setTimeout(() => {
    target.classList.remove('highlight-focused');
  }, 2000);

  if (window.innerWidth < 1024 && typeof onClosePanel === 'function') {
    onClosePanel();
  }

  return true;
}

export const QUOTE_MODAL_HOST_ID = 'tt-quote-modal-host';

/**
 * Opens the Quote Share Card modal.
 *
 * @param {Object} params
 * @param {string} params.quote
 * @param {string} [params.taleTitle]
 * @param {string} [params.authorName]
 * @param {string} [params.coverUrl]
 * @param {number} [params.chapterNum]
 */
export function openQuoteModal({
  quote = '',
  taleTitle = 'Untitled Tale',
  authorName = 'Unknown Scribe',
  coverUrl = '',
  chapterNum = 1,
} = {}) {
  closeQuoteModal();

  const host = document.createElement('div');
  host.id = QUOTE_MODAL_HOST_ID;
  host.innerHTML = renderQuoteCardModal({
    quote,
    taleTitle,
    authorName,
    coverUrl,
    chapterNum,
  });

  document.body.appendChild(host);
  initIcons(host);

  const overlay = host.querySelector('#tt-quote-modal');
  const close = () => closeQuoteModal();

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  host.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', close);
  });

  host.querySelector('[data-copy-quote]')?.addEventListener('click', () => {
    const textToCopy = `"${quote}"\n\n— ${authorName}, ${taleTitle}`;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showToast('Quote copied to clipboard.', 'success'))
      .catch(() => showToast('Could not copy quote to clipboard.', 'error'));
  });

  const onKey = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);
}

/**
 * Closes and cleans up the Quote Share Card modal.
 */
export function closeQuoteModal() {
  const host = document.getElementById(QUOTE_MODAL_HOST_ID);
  if (host) {
    host.remove();
  }
}
