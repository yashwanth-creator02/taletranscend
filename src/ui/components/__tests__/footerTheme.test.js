// src/ui/components/__tests__/footerTheme.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildFooterThemeControl, initFooterTheme } from '../footerTheme.js';
import * as themeConfig from '@/config/theme.config.js';

describe('footerTheme component', () => {
  let container;
  let cleanup;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = buildFooterThemeControl();
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    container.remove();
    vi.restoreAllMocks();
  });

  it('buildFooterThemeControl renders 3 theme buttons corresponding to all themes', () => {
    const boxes = container.querySelectorAll('.footer-theme-control__box');
    expect(boxes.length).toBe(3);

    const themeIds = Array.from(boxes).map((b) => b.getAttribute('data-theme-id'));
    expect(themeIds).toEqual(['transcendental', 'dark', 'light']);
  });

  it('initFooterTheme returns null if target is not found', () => {
    const result = initFooterTheme('#non-existent-target');
    expect(result).toBeNull();
  });

  it('sets the active theme button based on current app theme', () => {
    vi.spyOn(themeConfig, 'getSavedAppTheme').mockReturnValue('dark');
    vi.spyOn(themeConfig, 'resolveAppTheme').mockReturnValue('dark');

    cleanup = initFooterTheme(container.querySelector('#footer-theme-control'));

    const darkBtn = container.querySelector('[data-theme-id="dark"]');
    const lightBtn = container.querySelector('[data-theme-id="light"]');

    expect(darkBtn.classList.contains('active')).toBe(true);
    expect(darkBtn.getAttribute('aria-checked')).toBe('true');
    expect(darkBtn.getAttribute('tabindex')).toBe('0');

    expect(lightBtn.classList.contains('active')).toBe(false);
    expect(lightBtn.getAttribute('aria-checked')).toBe('false');
    expect(lightBtn.getAttribute('tabindex')).toBe('-1');
  });

  it('clicking a theme button calls applyAppTheme and updates active button', () => {
    vi.spyOn(themeConfig, 'getSavedAppTheme').mockReturnValue('transcendental');
    vi.spyOn(themeConfig, 'resolveAppTheme').mockImplementation((id) => id);
    const applySpy = vi.spyOn(themeConfig, 'applyAppTheme').mockImplementation((id) => id);

    cleanup = initFooterTheme(container.querySelector('#footer-theme-control'));

    const lightBtn = container.querySelector('[data-theme-id="light"]');
    lightBtn.click();

    expect(applySpy).toHaveBeenCalledWith('light');
    expect(lightBtn.classList.contains('active')).toBe(true);
    expect(lightBtn.getAttribute('aria-checked')).toBe('true');

    const transBtn = container.querySelector('[data-theme-id="transcendental"]');
    expect(transBtn.classList.contains('active')).toBe(false);
  });

  it('updates active state on window appthemechange event', () => {
    vi.spyOn(themeConfig, 'getSavedAppTheme').mockReturnValue('transcendental');
    vi.spyOn(themeConfig, 'resolveAppTheme').mockReturnValue('dark');

    cleanup = initFooterTheme(container.querySelector('#footer-theme-control'));

    // Trigger appthemechange
    vi.spyOn(themeConfig, 'getSavedAppTheme').mockReturnValue('dark');
    window.dispatchEvent(
      new CustomEvent('appthemechange', {
        detail: { theme: 'dark', resolvedTheme: 'dark' },
      })
    );

    const darkBtn = container.querySelector('[data-theme-id="dark"]');
    expect(darkBtn.classList.contains('active')).toBe(true);
    expect(darkBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('handles keyboard navigation with arrow keys', () => {
    vi.spyOn(themeConfig, 'getSavedAppTheme').mockReturnValue('transcendental');
    vi.spyOn(themeConfig, 'resolveAppTheme').mockImplementation((id) => id);
    const applySpy = vi.spyOn(themeConfig, 'applyAppTheme').mockImplementation((id) => id);

    cleanup = initFooterTheme(container.querySelector('#footer-theme-control'));

    const themeControl = container.querySelector('#footer-theme-control');
    const transBtn = container.querySelector('[data-theme-id="transcendental"]');
    transBtn.focus();

    // ArrowRight moves to 'dark'
    themeControl.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );

    expect(applySpy).toHaveBeenCalledWith('dark');
    const darkBtn = container.querySelector('[data-theme-id="dark"]');
    expect(darkBtn.classList.contains('active')).toBe(true);

    // ArrowRight again moves to 'light'
    themeControl.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    expect(applySpy).toHaveBeenCalledWith('light');

    // Home moves back to 'transcendental'
    themeControl.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })
    );
    expect(applySpy).toHaveBeenCalledWith('transcendental');
  });
});
