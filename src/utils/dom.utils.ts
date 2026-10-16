// src/utils/dom.utils.ts
// DOM helper utilities.

import { createLogger } from './logger.ts';

const log = createLogger('DomUtils');

/* ─────────────────────────────────────────────
   Selectors
   ───────────────────────────────────────────── */

/**
 * Selects a single element from the DOM.
 */
export function qs<T extends HTMLElement>(selector: string): T | null {
  return document.querySelector(selector);
}

/**
 * Selects all elements matching a selector.
 */
export function qsa<T extends HTMLElement>(selector: string): T[] {
  return Array.from(document.querySelectorAll(selector));
}

/* ─────────────────────────────────────────────
   Creation & Manipulation
   ───────────────────────────────────────────── */

/**
 * Creates a new DOM element with optional attributes and text.
 */
export function createEl<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  attrs: Record<string, string> = {},
  text: string = ''
): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'class' || key === 'className') {
      el.className = val;
    } else {
      el.setAttribute(key, val);
    }
  });
  if (text) el.textContent = text;
  return el;
}

/**
 * Toggles a CSS class on an element.
 */
export function toggleClass(el: HTMLElement | null, className: string, force?: boolean): void {
  el?.classList.toggle(className, force);
}

/* ─────────────────────────────────────────────
   Inputs
   ───────────────────────────────────────────── */

/**
 * Gets a trimmed input value by element ID.
 *
 * @param id - Input element ID
 * @returns Trimmed value or empty string
 */
export function getInput(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | null;
  return el?.value.trim() ?? '';
}

/**
 * Sets an input value by element ID.
 *
 * @param id - Input element ID
 * @param value - Value to set
 */
export function setInput(id: string, value: string | number | null | undefined): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) {
    el.value = String(value ?? '');
  }
}

/**
 * Sets a select value only if the option exists.
 *
 * @param id - Select element ID
 * @param value - Option value to select
 */
export function setSelect(id: string, value: string | null | undefined): void {
  const el = document.getElementById(id) as HTMLSelectElement | null;

  if (!el || !value) return;

  if ([...el.options].some((option) => option.value === value)) {
    el.value = value;
  }
}

/**
 * Sets the textContent of a DOM element by ID.
 * Safe to call with missing elements — silently no-ops.
 * Replaces the _setText / _setText / setText pattern duplicated across pages.
 *
 * @param id - Element ID
 * @param value - Text value to set
 */
export function setText(id: string, value: string | number | null | undefined): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? '');
}

/**
 * Updates document title and OpenGraph / Twitter metadata tags dynamically.
 *
 * @param meta - Object with title, description, image, and url
 */
export function updatePageMeta(meta: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}): void {
  if (typeof document === 'undefined') return;

  if (meta.title) {
    document.title = `${meta.title} | TaleTranscend`;
    _setMetaTag('property', 'og:title', meta.title);
    _setMetaTag('name', 'twitter:title', meta.title);
  }

  if (meta.description) {
    _setMetaTag('name', 'description', meta.description);
    _setMetaTag('property', 'og:description', meta.description);
    _setMetaTag('name', 'twitter:description', meta.description);
  }

  if (meta.image) {
    _setMetaTag('property', 'og:image', meta.image);
    _setMetaTag('name', 'twitter:image', meta.image);
  }

  if (meta.url) {
    _setMetaTag('property', 'og:url', meta.url);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', meta.url);
    }
  }
}

function _setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

log.debug('DomUtils initialized');
