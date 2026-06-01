// src/utils/dom.utils.ts
// DOM helper utilities.

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
