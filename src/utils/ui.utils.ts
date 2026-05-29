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

/**
 * Safely sets the textContent of an element by ID.
 */
export function setEl(id: string, value: string | number): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? '');
}

/**
 * Safely sets the textContent of an element by ID (alias for setEl).
 */
export function setText(id: string, value: string | number): void {
  setEl(id, value);
}

/**
 * Safely sets the value of an input element by ID.
 */
export function setInput(id: string, value: string | number | null | undefined): void {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = String(value ?? '');
}

/**
 * Formats a number into a compact string (e.g., 1500 -> 1.5k).
 */
export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n || 0);
}

/**
 * Formats a date or ISO string into a "time ago" string.
 */
export function timeAgo(date: Date | string | number): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats an ISO string into a "Month Year" join date.
 */
export function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}
