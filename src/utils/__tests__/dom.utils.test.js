import { describe, it, expect } from 'vitest';
import { qs, qsa, createEl, toggleClass } from '../dom.utils.ts';

describe('qs', () => {
  it('returns null for missing element', () => {
    expect(qs('#nonexistent')).toBeNull();
  });
});

describe('createEl', () => {
  it('creates element with tag', () => {
    const el = createEl('div');
    expect(el.tagName).toBe('DIV');
  });

  it('applies classes', () => {
    const el = createEl('span', { class: 'test-class' });
    expect(el.classList.contains('test-class')).toBe(true);
  });

  it('sets text content', () => {
    const el = createEl('p', {}, 'Hello');
    expect(el.textContent).toBe('Hello');
  });
});
