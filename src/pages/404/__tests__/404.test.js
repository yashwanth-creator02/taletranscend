// src/pages/404/__tests__/404.test.js
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showReportDialog: vi.fn(),
}));

vi.mock('@config/theme.config.js', () => ({ initAppTheme: vi.fn() }));
vi.mock('@ui/icons.js', () => ({ initIcons: vi.fn() }));
vi.mock('@/utils', () => ({
  initPageReveal: vi.fn(),
  readyReveal: vi.fn(),
}));
vi.mock('@ui/components/reportDialog.js', () => ({
  showReportDialog: mocks.showReportDialog,
}));

describe('404 page report entry point', () => {
  it('opens a contextual page report from the recovery actions', async () => {
    document.body.innerHTML =
      '<button id="btn-report-page" type="button">Report this page</button>';

    await import('../404.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.getElementById('btn-report-page').click();

    expect(mocks.showReportDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Report this page',
        category: 'bug',
        targetType: 'page',
        targetId: window.location.pathname,
      })
    );
  });
});
