/**
 * Sets up a timeout guard for authentication.
 *
 * @param {string} containerId - The ID of the DOM element to show the error in
 * @param {string} message - The error message to display
 * @param {number} timeoutMs - Timeout duration in milliseconds
 * @returns {number} The timeout ID
 */
export function setupAuthTimeout(
  containerId,
  message = 'Connection timed out. Please refresh.',
  timeoutMs = 10000
) {
  return setTimeout(() => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
          ${message}
        </div>
      `;
    }
  }, timeoutMs);
}
