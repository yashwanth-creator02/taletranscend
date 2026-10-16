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

  it('registers MoreVertical icon for menus', async () => {
    const { initIcons } = await import('../icons.js');
    await initIcons();

    await vi.waitFor(
      () => {
        expect(mockCreateIcons).toHaveBeenCalled();
        const lastCall = mockCreateIcons.mock.calls[mockCreateIcons.mock.calls.length - 1][0];
        expect(lastCall.icons.MoreVertical).toBeDefined();
      },
      { timeout: 1000 }
    );
  });

  it('registers chronicle missives and newly required icons', async () => {
    const { initIcons } = await import('../icons.js');
    await initIcons();

    await vi.waitFor(
      () => {
        expect(mockCreateIcons).toHaveBeenCalled();
        const lastCall = mockCreateIcons.mock.calls[mockCreateIcons.mock.calls.length - 1][0];
        expect(lastCall.icons.ArrowDownUp).toBeDefined();
        expect(lastCall.icons.Inbox).toBeDefined();
        expect(lastCall.icons.History).toBeDefined();
        expect(lastCall.icons.Reply).toBeDefined();
        expect(lastCall.icons.Ban).toBeDefined();
        expect(lastCall.icons.Quote).toBeDefined();
        expect(lastCall.icons.BookOpenCheck).toBeDefined();
        expect(lastCall.icons.EyeOff).toBeDefined();
        // Settings & controls icons
        expect(lastCall.icons.Sliders).toBeDefined();
        expect(lastCall.icons.SearchX).toBeDefined();
        expect(lastCall.icons.UserPen).toBeDefined();
        expect(lastCall.icons.Shield).toBeDefined();
        expect(lastCall.icons.ALargeSmall).toBeDefined();
        expect(lastCall.icons.AlignJustify).toBeDefined();
        expect(lastCall.icons.Zap).toBeDefined();
      },
      { timeout: 1000 }
    );
  });

  it('has all static data-lucide icons across all views registered in the icon map', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { initIcons } = await import('../icons.js');
    await initIcons();

    const lastCall = mockCreateIcons.mock.calls[mockCreateIcons.mock.calls.length - 1][0];
    const registered = new Set(Object.keys(lastCall.icons).map((k) => k.toLowerCase()));

    const viewsDir = path.resolve(__dirname, '../../views');
    const htmlFiles = fs.readdirSync(viewsDir).filter((f) => f.endsWith('.html'));

    const missingInViews = [];
    for (const file of htmlFiles) {
      const content = fs.readFileSync(path.join(viewsDir, file), 'utf8');
      const matches = content.matchAll(/data-lucide=["']([^"'${}]+)["']/g);
      for (const m of matches) {
        const iconName = m[1].trim();
        const normalized = iconName.replace(/-/g, '').toLowerCase();
        if (!registered.has(normalized)) {
          missingInViews.push(`${file}: ${iconName}`);
        }
      }
    }

    expect(missingInViews).toEqual([]);
  });
});
