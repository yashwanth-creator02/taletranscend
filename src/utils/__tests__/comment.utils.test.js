// src/utils/__tests__/comment.utils.test.js
// Single home for the shared comment helpers' unit tests (audit F5).
// The tale and reader suites cover how the pages *use* these helpers;
// behaviour of the helpers themselves is pinned here.
import { describe, it, expect } from 'vitest';
import { formatCommentDateTime, buildReplyTree } from '@/utils/comment.utils.ts';

describe('formatCommentDateTime', () => {
  it('returns "Recently" for missing or unparseable timestamps', () => {
    expect(formatCommentDateTime(null)).toBe('Recently');
    expect(formatCommentDateTime(undefined)).toBe('Recently');
    expect(formatCommentDateTime('not-a-date')).toBe('Recently');
  });

  it('formats a Date object with date and time', () => {
    const d = new Date(2026, 9, 12, 23, 5); // Oct 12, 2026 23:05 local
    expect(formatCommentDateTime(d)).toBe('Oct 12, 2026 at 11:05 PM');
  });

  it('formats epoch milliseconds', () => {
    const ms = new Date(2026, 9, 12, 23, 5).getTime();
    expect(formatCommentDateTime(ms)).toBe('Oct 12, 2026 at 11:05 PM');
  });

  it('formats ISO date strings', () => {
    expect(formatCommentDateTime('2026-10-12T23:05:00')).toBe('Oct 12, 2026 at 11:05 PM');
  });

  it('unwraps Firestore { seconds } timestamps instead of falling through to "Recently"', () => {
    const seconds = Math.floor(new Date(2026, 9, 12, 23, 5).getTime() / 1000);
    expect(formatCommentDateTime({ seconds })).toBe('Oct 12, 2026 at 11:05 PM');
  });
});

describe('buildReplyTree', () => {
  it('returns an empty array for missing, empty, or non-array input', () => {
    expect(buildReplyTree([])).toEqual([]);
    expect(buildReplyTree(null)).toEqual([]);
    expect(buildReplyTree(undefined)).toEqual([]);
  });

  it('returns flat nodes as roots when none have replyToId', () => {
    const replies = [
      { id: 'r1', body: 'First' },
      { id: 'r2', body: 'Second' },
    ];
    const tree = buildReplyTree(replies);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('r1');
    expect(tree[0].children).toEqual([]);
    expect(tree[1].id).toBe('r2');
    expect(tree[1].children).toEqual([]);
  });

  it('nests multi-level reply chains under their parents', () => {
    const replies = [
      { id: 'r1', body: 'Level 1' },
      { id: 'r2', replyToId: 'r1', body: 'Level 2' },
      { id: 'r3', replyToId: 'r2', body: 'Level 3' },
      { id: 'r4', replyToId: 'r1', body: 'Another Level 2' },
    ];
    const tree = buildReplyTree(replies);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('r1');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].id).toBe('r2');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe('r3');
    expect(tree[0].children[1].id).toBe('r4');
  });

  it('treats replies pointing at unknown ids as root nodes', () => {
    const replies = [
      { id: 'r1', body: 'Parent' },
      { id: 'r2', replyToId: 'missing-parent', body: 'Orphan reply' },
    ];
    const tree = buildReplyTree(replies);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('r1');
    expect(tree[1].id).toBe('r2');
  });
});
