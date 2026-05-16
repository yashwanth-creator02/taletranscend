/**
 * Creates a debounced function that delays invoked func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} delay - The number of milliseconds to delay
 * @returns {Function} The new debounced function
 */
export function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
