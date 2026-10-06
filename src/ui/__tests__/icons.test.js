// src/ui/__tests__/icons.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateIcons } = vi.hoisted(() => ({
  mockCreateIcons: vi.fn(),
}));

// Mock createIcons while preserving all icon definitions and brand fallbacks
vi.mock('lucide', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Twitter: actual.X || {},
    Instagram: actual.Camera || {},
    Linkedin: {},
    createIcons: mockCreateIcons,
  };
});

describe('Icons Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<i data-lucide="chevron-up"></i>';
  });

  it('calls createIcons when initialized', async () => {
    const { initIcons } = await import('../icons.js');
    await initIcons();

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
