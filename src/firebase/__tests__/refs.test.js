// src/firebase/__tests__/refs.test.js
import { describe, it, expect, vi } from 'vitest';
import { refs } from '../refs.js';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn((db, path) => ({ type: 'doc', path })),
  collection: vi.fn((db, path) => ({ type: 'collection', path })),
}));

// Mock db
vi.mock('../db.js', () => ({
  db: { id: 'mock-db' },
}));

describe('Firebase Refs', () => {
  describe('Public Tales', () => {
    it('tales() returns a collection ref', () => {
      const ref = refs.tales();
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/public/data/tales');
    });

    it('tale(id) returns a doc ref', () => {
      const ref = refs.tale('123');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/data/tales/123');
    });

    it('chapters(id) returns a collection ref', () => {
      const ref = refs.chapters('123');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/public/data/tales/123/chapters');
    });

    it('chapter(tid, idx) returns a doc ref', () => {
      const ref = refs.chapter('123', 5);
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/data/tales/123/chapters/5');
    });

    it('comments(tid) returns a collection ref', () => {
      const ref = refs.comments('123');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/public/data/tales/123/comments');
    });

    it('comment(tid, cid) returns a doc ref', () => {
      const ref = refs.comment('123', 'c1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/data/tales/123/comments/c1');
    });

    it('commentLikes(tid, cid) returns a collection ref', () => {
      const ref = refs.commentLikes('123', 'c1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/public/data/tales/123/comments/c1/likes');
    });

    it('commentLike(tid, cid, uid) returns a doc ref', () => {
      const ref = refs.commentLike('123', 'c1', 'u1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/data/tales/123/comments/c1/likes/u1');
    });

    it('taleReactions(tid) returns a collection ref', () => {
      const ref = refs.taleReactions('123');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/public/data/tales/123/reactions');
    });

    it('taleReaction(tid, uid) returns a doc ref', () => {
      const ref = refs.taleReaction('123', 'u1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/data/tales/123/reactions/u1');
    });

    it('taleVersions(tid) returns a collection ref', () => {
      const ref = refs.taleVersions('123');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/public/data/tales/123/versions');
    });

    it('taleVersion(tid, vid) returns a doc ref', () => {
      const ref = refs.taleVersion('123', 'v1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/data/tales/123/versions/v1');
    });
  });

  describe('Public Meta & Tags', () => {
    it('featured() returns a doc ref', () => {
      const ref = refs.featured();
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/meta/featured');
    });

    it('globalStats() returns a doc ref', () => {
      const ref = refs.globalStats();
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/meta/stats');
    });

    it('tags() returns a collection ref', () => {
      const ref = refs.tags();
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/public/data/tags');
    });

    it('tag(t) returns a doc ref', () => {
      const ref = refs.tag('mythic');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/public/data/tags/mythic');
    });
  });

  describe('User Data & Lists', () => {
    it('user(uid) returns a doc ref', () => {
      const ref = refs.user('abc');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/abc');
    });

    it('readerPrefs(uid) returns a doc ref', () => {
      const ref = refs.readerPrefs('abc');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/abc/preferences/reader');
    });

    it('bookmarks(uid) returns a collection ref', () => {
      const ref = refs.bookmarks('abc');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/abc/bookmarks');
    });

    it('bookmark(uid, tid) returns a doc ref', () => {
      const ref = refs.bookmark('abc', '123');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/abc/bookmarks/123');
    });

    it('lists(uid) returns a collection ref', () => {
      const ref = refs.lists('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/lists');
    });

    it('list(uid, lid) returns a doc ref', () => {
      const ref = refs.list('u1', 'l1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/lists/l1');
    });

    it('listTales(uid, lid) returns a collection ref', () => {
      const ref = refs.listTales('u1', 'l1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/lists/l1/tales');
    });

    it('listTale(uid, lid, tid) returns a doc ref', () => {
      const ref = refs.listTale('u1', 'l1', 't1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/lists/l1/tales/t1');
    });
  });

  describe('Drafts & Progress', () => {
    it('drafts(uid) returns a collection ref', () => {
      const ref = refs.drafts('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/drafts');
    });

    it('draft(uid, did) returns a doc ref', () => {
      const ref = refs.draft('u1', 'd1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/drafts/d1');
    });

    it('draftChapters(uid, did) returns a collection ref', () => {
      const ref = refs.draftChapters('u1', 'd1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/drafts/d1/chapters');
    });

    it('draftChapter(uid, did, idx) returns a doc ref', () => {
      const ref = refs.draftChapter('u1', 'd1', 0);
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/drafts/d1/chapters/0');
    });

    it('progressList(uid) returns a collection ref', () => {
      const ref = refs.progressList('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/readerProgress');
    });

    it('progress(uid, tid) returns a doc ref', () => {
      const ref = refs.progress('u1', 't1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/readerProgress/t1');
    });

    it('progressChapters(uid, tid) returns a collection ref', () => {
      const ref = refs.progressChapters('u1', 't1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/readerProgress/t1/chapters');
    });

    it('progressChapter(uid, tid, idx) returns a doc ref', () => {
      const ref = refs.progressChapter('u1', 't1', 0);
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/readerProgress/t1/chapters/0');
    });
  });

  describe('History, Social & Notifications', () => {
    it('readingHistory(uid) returns a collection ref', () => {
      const ref = refs.readingHistory('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/readingHistory');
    });

    it('readingHistoryEntry(uid, tid) returns a doc ref', () => {
      const ref = refs.readingHistoryEntry('u1', 't1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/readingHistory/t1');
    });

    it('following(uid) returns a collection ref', () => {
      const ref = refs.following('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/following');
    });

    it('followingEntry(uid, target) returns a doc ref', () => {
      const ref = refs.followingEntry('u1', 'u2');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/following/u2');
    });

    it('followers(uid) returns a collection ref', () => {
      const ref = refs.followers('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/followers');
    });

    it('followerEntry(uid, f) returns a doc ref', () => {
      const ref = refs.followerEntry('u1', 'u2');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/followers/u2');
    });

    it('notifications(uid) returns a collection ref', () => {
      const ref = refs.notifications('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/notifications');
    });

    it('notification(uid, nid) returns a doc ref', () => {
      const ref = refs.notification('u1', 'n1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/notifications/n1');
    });

    it('achievements(uid) returns a collection ref', () => {
      const ref = refs.achievements('u1');
      expect(ref.type).toBe('collection');
      expect(ref.path).toContain('/users/u1/achievements');
    });

    it('achievement(uid, aid) returns a doc ref', () => {
      const ref = refs.achievement('u1', 'a1');
      expect(ref.type).toBe('doc');
      expect(ref.path).toContain('/users/u1/achievements/a1');
    });
  });
});
