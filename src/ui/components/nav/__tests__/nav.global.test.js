import { describe, it, expect, beforeEach } from 'vitest';
import { initGlobalPaletteShortcut, toggleGlobalCommandPalette } from '../nav.global.js';

describe('Global Palette Shortcut', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('attaches keydown listener without error', () => {
    expect(() => initGlobalPaletteShortcut()).not.toThrow();
  });

  it('mounts palette DOM and opens when toggled on standalone page', async () => {
    expect(document.getElementById('nav-command-palette')).toBeNull();

    await toggleGlobalCommandPalette();

    const palette = document.getElementById('nav-command-palette');
    expect(palette).not.toBeNull();
  });
});
