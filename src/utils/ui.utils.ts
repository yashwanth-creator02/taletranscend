/**
 * Sets up a timeout guard for authentication.
 *
 * @param containerId - The ID of the DOM element to show the error in
 * @param message - The error message to display
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns The timeout ID
 */
export function setupAuthTimeout(
  containerId: string,
  message: string = 'Connection timed out. Please refresh.',
  timeoutMs: number = 10000
): ReturnType<typeof setTimeout> {
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
