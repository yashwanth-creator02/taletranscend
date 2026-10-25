// src/pages/404/404.js
// Entry point for the 404 error page.

import '@css/base.css';
import '@css/components.css';
import '@css/components/moderation.css';
import { initAppTheme } from '@config/theme.config.js';
import { initIcons } from '@ui/icons.js';
import { initPageReveal, readyReveal } from '@/utils';
import { showReportDialog } from '@ui/components/reportDialog.js';

initAppTheme();
initPageReveal();

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  readyReveal();

  document.getElementById('btn-report-page')?.addEventListener('click', () => {
    showReportDialog({
      title: 'Report this page',
      subject: 'Broken or missing page',
      category: 'bug',
      description: 'This page could not be found or did not load correctly.',
      targetType: 'page',
      targetId: window.location.pathname || '404',
      pageUrl: window.location.href,
    });
  });
});
