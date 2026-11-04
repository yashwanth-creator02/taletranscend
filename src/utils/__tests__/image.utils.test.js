import { describe, it, expect } from 'vitest';
import { sizedCoverUrl } from '../image.utils.ts';

const UNSPLASH =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';

describe('sizedCoverUrl', () => {
  it('rewrites width and quality for Unsplash URLs', () => {
    const out = sizedCoverUrl(UNSPLASH, 480);
    expect(out).toContain('w=480');
    expect(out).toContain('q=70');
    expect(out).toContain('fit=crop');
  });

  it('leaves other hosts untouched', () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/x/o/cover.jpg';
    expect(sizedCoverUrl(url, 480)).toBe(url);
  });

  it('leaves relative and empty values untouched', () => {
    expect(sizedCoverUrl('/assets/cover.png', 480)).toBe('/assets/cover.png');
    expect(sizedCoverUrl('', 480)).toBe('');
  });

  it('ignores invalid widths', () => {
    expect(sizedCoverUrl(UNSPLASH, 0)).toBe(UNSPLASH);
    expect(sizedCoverUrl(UNSPLASH, NaN)).toBe(UNSPLASH);
  });
});
