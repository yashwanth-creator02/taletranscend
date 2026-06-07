// src/utils/dom.utils.ts
// DOM helper utilities.

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
