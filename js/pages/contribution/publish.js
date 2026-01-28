import { state } from './state.js';

/* ================= Publish Tale ================= */

/**
 * Placeholder function for publishing the full tale.
 * Currently logs the chapters and shows a temporary alert.
 *
 * In the future, this will handle sending the tale to the server,
 * making it publicly available, or any other publishing workflow.
 */
export function publishFullTale() {
  // Log the current chapters for debugging
  console.log('Publishing tale:', state.chapters);

  // Temporary feedback for the user
  alert('Publish flow coming next 🚀');
}
