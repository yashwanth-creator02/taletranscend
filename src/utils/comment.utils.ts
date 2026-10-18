// src/utils/comment.utils.ts
// Shared comment helpers used by both the tale page and the reader page.
// These were previously duplicated in `pages/tale/comments.js` and
// `pages/reader/templates.js`; keep a single implementation here.

/**
 * Timestamp shapes the app can receive for a comment:
 * epoch milliseconds, ISO strings, Date objects, or Firestore `{ seconds }`
 * timestamp objects.
 */
export type CommentTimestamp = number | string | Date | { seconds: number } | null | undefined;

/**
 * Formats a comment timestamp to include both date and time.
 * E.g., "Oct 12, 2026 at 11:05 PM"
 *
 * Firestore `{ seconds }` timestamps are unwrapped; without this they would
 * fall through to `new Date(object)` and render "Recently".
 *
 * @param at - Comment timestamp in any supported shape
 * @returns A human-readable date/time string, or "Recently" when unparseable
 */
export function formatCommentDateTime(at: CommentTimestamp): string {
  if (!at) return 'Recently';

  let d: Date;
  if (typeof at === 'object' && !(at instanceof Date)) {
    // Firestore timestamp shape: { seconds }
    d = new Date(at.seconds * 1000);
  } else {
    d = new Date(at);
  }

  if (isNaN(d.getTime())) return 'Recently';

  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateStr} at ${timeStr}`;
}

/** Minimal shape a reply needs in order to be nested by {@link buildReplyTree}. */
export interface ReplyLike {
  id: string;
  replyToId?: string | null;
}

/**
 * Builds a hierarchical tree from a flat array of replies containing replyToId.
 * Replies whose replyToId is absent or points at an unknown id become roots.
 *
 * @param replies - Flat reply list
 * @returns Root replies with nested `children` arrays
 */
export function buildReplyTree<T extends ReplyLike>(
  replies: T[] | null | undefined
): Array<T & { children: unknown[] }> {
  if (!Array.isArray(replies) || replies.length === 0) return [];

  const map = new Map<string, T & { children: unknown[] }>();
  const roots: Array<T & { children: unknown[] }> = [];

  replies.forEach((r) => {
    map.set(r.id, { ...r, children: [] });
  });

  replies.forEach((r) => {
    const node = map.get(r.id);
    if (!node) return;
    if (r.replyToId && map.has(r.replyToId)) {
      map.get(r.replyToId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
