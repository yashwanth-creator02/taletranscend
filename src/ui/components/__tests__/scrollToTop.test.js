// src/ui/components/__tests__/scrollToTop.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initScrollToTop } from '../scrollToTop.js';

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('scrollToTop Component', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="main-content" style="height: 500px; overflow-y: auto;"></main>
    `;
    window.scrollTo = vi.fn();
    const main = document.getElementById('main-content');
    main.scrollTo = vi.fn();
  });

  it('creates and mounts the scroll-to-top button if not present', () => {
    expect(document.getElementById('scroll-to-top')).toBeNull();
    initScrollToTop();
    const btn = document.getElementById('scroll-to-top');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Scroll to top');
    expect(btn.innerHTML).toContain('data-lucide="arrow-up"');
  });

  it('updates existing button icon to arrow-up if different', () => {
    document.body.innerHTML = `
      <button id="scroll-to-top"><i data-lucide="chevron-up"></i></button>
    `;
    initScrollToTop();
    const btn = document.getElementById('scroll-to-top');
    const icon = btn.querySelector('i');
    expect(icon.getAttribute('data-lucide')).toBe('arrow-up');
  });

  it('scrolls window and main to top when clicked', () => {
    initScrollToTop();
    const btn = document.getElementById('scroll-to-top');
    const main = document.getElementById('main-content');
    main.scrollTop = 300;

    btn.click();
    expect(main.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('toggles visibility based on scroll position', () => {
    initScrollToTop();
    const btn = document.getElementById('scroll-to-top');
    expect(btn.classList.contains('opacity-100')).toBe(false);

    // Simulate scroll down
    Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(btn.classList.contains('is-visible')).toBe(true);
    expect(btn.classList.contains('opacity-100')).toBe(true);

    // Simulate scroll back to top
    window.scrollY = 10;
    window.dispatchEvent(new Event('scroll'));

    expect(btn.classList.contains('opacity-0')).toBe(true);
    expect(btn.classList.contains('is-visible')).toBe(false);
  });
});
