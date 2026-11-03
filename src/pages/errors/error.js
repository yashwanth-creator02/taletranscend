// src/pages/errors/error.js
//
// Shared entry point for every static error page. The page supplies its code
// on <body data-error-code>, and this module adds the optional request
// context, retry behaviour and offline hint.

import '@css/base.css';
import '@css/components.css';
import { initAppTheme } from '@config/theme.config.js';
import { initIcons } from '@ui/icons.js';
import {
  getErrorCodeFromPath,
  initPageReveal,
  isErrorPagePath,
  readErrorContext,
  readyReveal,
} from '@/utils';

initAppTheme();
initPageReveal();

function readPageCode() {
  const fromBody = Number.parseInt(document.body?.dataset.errorCode || '', 10);
  if (Number.isInteger(fromBody)) return fromBody;
  return getErrorCodeFromPath(window.location.pathname);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderContext() {
  const panel = document.getElementById('error-context');
  if (!panel) return;

  const code = readPageCode();
  const context = readErrorContext();

  if (!context || (code !== null && context.code !== code)) {
    panel.hidden = true;
    return;
  }

  setText('error-context-source', context.source);

  const reasonRow = document.getElementById('error-context-reason-row');
  if (context.reason) {
    setText('error-context-reason', context.reason);
    if (reasonRow) reasonRow.hidden = false;
  } else if (reasonRow) {
    reasonRow.hidden = true;
  }

  const time = document.getElementById('error-context-time');
  if (time) {
    time.textContent = formatTimestamp(context.createdAt);
    time.dateTime = new Date(context.createdAt).toISOString();
  }

  panel.hidden = false;
}

function isSafeRetrySource(source) {
  if (typeof source !== 'string' || !source.startsWith('/') || source.startsWith('//')) {
    return false;
  }

  try {
    const url = new URL(source, window.location.origin);
    return url.origin === window.location.origin && !isErrorPagePath(url.pathname);
  } catch {
    return false;
  }
}

function setupRetry() {
  const context = readErrorContext();
  const buttons = document.querySelectorAll('[data-error-retry]');
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      if (context && isSafeRetrySource(context.source)) {
        window.location.assign(context.source);
        return;
      }
      window.location.reload();
    });
  });
}

function setupOfflineHint() {
  const hint = document.getElementById('error-offline-hint');
  if (!hint) return;

  const update = () => {
    hint.hidden = navigator.onLine !== false;
  };

  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

function initErrorPage() {
  initIcons();
  renderContext();
  setupRetry();
  setupOfflineHint();
  readyReveal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initErrorPage, { once: true });
} else {
  initErrorPage();
}
