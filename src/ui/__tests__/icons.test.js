// src/ui/__tests__/icons.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateIcons = vi.fn();

// Use a simpler mock for lucide
vi.mock('lucide', () => ({
  createIcons: mockCreateIcons,
  ChevronUp: {},
  ChevronDown: {},
  Plus: {},
}));

describe.skip('Icons Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<i data-lucide="chevron-up"></i>';
  });

  it('calls createIcons when initialized', async () => {
    // If it's already loaded, initIcons will render sync
    const { initIcons } = await import('../icons.js');
    await initIcons();

    // We wait a bit in case it's still bootstrapping
    await vi.waitFor(
      () => {
        expect(mockCreateIcons).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  it('handles scope restricted initialization', async () => {
    const { initIcons } = await import('../icons.js');
    const btn = document.createElement('button');
    btn.innerHTML = '<i data-lucide="plus"></i>';
    document.body.appendChild(btn);

    await initIcons(btn);

    await vi.waitFor(
      () => {
        expect(mockCreateIcons).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });
});
