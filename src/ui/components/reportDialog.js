// src/ui/components/reportDialog.js
// Accessible, reusable report form used by comments, tale pages, the 404 page,
// and Settings. The dialog only collects context; report.service.js performs
// the registered-user check and the Firestore write.

import { showToast } from '@ui/components/toast.js';
import { isRegisteredUser, showGuestGateToast } from '@services/auth.guard.js';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABELS,
  createReport,
} from '@services/report.service.js';
import { escapeHtml } from '@/utils';

const DIALOG_ID = 'report-dialog';

function categoryOptions(selected) {
  return REPORT_CATEGORIES.map(
    (category) =>
      `<option value="${category}" ${category === selected ? 'selected' : ''}>${escapeHtml(
        REPORT_CATEGORY_LABELS[category] ?? category
      )}</option>`
  ).join('');
}

function removeDialog() {
  document.getElementById(DIALOG_ID)?.remove();
}

/**
 * Opens the report form. Resolves true when a report was submitted.
 *
 * @param {{
 *   title?: string,
 *   subject?: string,
 *   category?: string,
 *   description?: string,
 *   targetType?: string,
 *   targetId?: string,
 *   taleId?: string,
 *   commentId?: string,
 *   replyId?: string,
 *   pageUrl?: string,
 * }} [context]
 * @returns {Promise<boolean>}
 */
export function showReportDialog(context = {}) {
  if (!isRegisteredUser()) {
    showGuestGateToast('submit a report');
    return Promise.resolve(false);
  }

  removeDialog();

  const pageUrl = context.pageUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const subject = context.subject || '';
  const category = REPORT_CATEGORIES.includes(context.category) ? context.category : 'other';
  const description = context.description || '';
  const title = context.title || 'Report a concern';

  const overlay = document.createElement('div');
  overlay.id = DIALOG_ID;
  overlay.className = 'report-dialog';
  overlay.innerHTML = `
    <div class="report-dialog__backdrop" data-report-close></div>
    <div class="report-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
      <header class="report-dialog__header">
        <div>
          <p class="report-dialog__eyebrow">Reader report</p>
          <h2 class="report-dialog__title" id="report-dialog-title">${escapeHtml(title)}</h2>
        </div>
        <button type="button" class="report-dialog__close" data-report-close aria-label="Close report form">Close</button>
      </header>
      <form class="report-dialog__form">
        <label class="report-dialog__field">
          <span>Subject</span>
          <input name="subject" type="text" maxlength="160" required value="${escapeHtml(subject)}" placeholder="What is this report about?" />
        </label>
        <label class="report-dialog__field">
          <span>Category</span>
          <select name="category" required>${categoryOptions(category)}</select>
        </label>
        <label class="report-dialog__field">
          <span>Description</span>
          <textarea name="description" rows="6" maxlength="5000" required placeholder="Describe what happened and any context that helps the administrator review it.">${escapeHtml(description)}</textarea>
        </label>
        <p class="report-dialog__context">
          Context: ${escapeHtml(context.targetType || 'website')}${context.targetId ? ` / ${escapeHtml(context.targetId)}` : ''}
        </p>
        <div class="report-dialog__actions">
          <button type="button" class="report-dialog__secondary" data-report-close>Cancel</button>
          <button type="submit" class="report-dialog__primary">Submit report</button>
        </div>
        <p class="report-dialog__note">Please allow time for the administrator to review your report. If you do not receive a reply within 3 business days, please contact us at leo.two.dev@gmail.com.</p>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  const panel = overlay.querySelector('.report-dialog__panel');
  const form = overlay.querySelector('form');
  const firstField = overlay.querySelector('input[name="subject"]');
  const submitButton = overlay.querySelector('button[type="submit"]');
  let settled = false;

  const close = (result) => {
    if (settled) return;
    settled = true;
    document.removeEventListener('keydown', onKeydown);
    removeDialog();
    resolve(result);
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = panel.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });

  overlay.querySelectorAll('[data-report-close]').forEach((button) => {
    button.addEventListener('click', () => close(false));
  });
  document.addEventListener('keydown', onKeydown);
  firstField?.focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    try {
      await createReport({
        subject: form.elements.subject.value,
        category: form.elements.category.value,
        description: form.elements.description.value,
        targetType: context.targetType,
        targetId: context.targetId,
        taleId: context.taleId,
        commentId: context.commentId,
        replyId: context.replyId,
        pageUrl,
      });
      showToast('Report submitted. The administrator will review it.', { type: 'success' });
      close(true);
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit report';
      showToast(error instanceof Error ? error.message : 'The report could not be submitted.', {
        type: 'error',
      });
    }
  });

  return promise;
}

export { DIALOG_ID };
