// src/firebase/__tests__/paths.test.js
import { describe, it, expect } from 'vitest';
import { PATHS, APP_ROOT } from '../paths.js';

describe('Firebase Paths', () => {
  it('should have a consistent APP_ROOT', () => {
    expect(APP_ROOT).toBe('v1/taletranscend/projects/v1');
  });

  describe('Public Tales', () => {
    it('publicTales() returns the correct path', () => {
      expect(PATHS.publicTales()).toBe(`${APP_ROOT}/public/data/tales`);
    });

    it('publicTale(id) returns the correct path', () => {
      expect(PATHS.publicTale('123')).toBe(`${APP_ROOT}/public/data/tales/123`);
    });

    it('publicTaleChapters(id) returns the correct path', () => {
      expect(PATHS.publicTaleChapters('123')).toBe(`${APP_ROOT}/public/data/tales/123/chapters`);
    });

    it('publicTaleChapter(tid, idx) returns the correct path', () => {
      expect(PATHS.publicTaleChapter('123', 5)).toBe(
        `${APP_ROOT}/public/data/tales/123/chapters/5`
      );
    });

    it('publicTaleComments(tid) returns the correct path', () => {
      expect(PATHS.publicTaleComments('123')).toBe(`${APP_ROOT}/public/data/tales/123/comments`);
    });

    it('publicTaleComment(tid, cid) returns the correct path', () => {
      expect(PATHS.publicTaleComment('123', 'c1')).toBe(
        `${APP_ROOT}/public/data/tales/123/comments/c1`
      );
    });

    it('commentLikes(tid, cid) returns the correct path', () => {
      expect(PATHS.commentLikes('123', 'c1')).toBe(
        `${APP_ROOT}/public/data/tales/123/comments/c1/likes`
      );
    });

    it('commentLike(tid, cid, uid) returns the correct path', () => {
      expect(PATHS.commentLike('123', 'c1', 'u1')).toBe(
        `${APP_ROOT}/public/data/tales/123/comments/c1/likes/u1`
      );
    });

    it('taleReactions(tid) returns the correct path', () => {
      expect(PATHS.taleReactions('123')).toBe(`${APP_ROOT}/public/data/tales/123/reactions`);
    });

    it('taleReaction(tid, uid) returns the correct path', () => {
      expect(PATHS.taleReaction('123', 'u1')).toBe(
        `${APP_ROOT}/public/data/tales/123/reactions/u1`
      );
    });

    it('taleVersions(tid) returns the correct path', () => {
      expect(PATHS.taleVersions('123')).toBe(`${APP_ROOT}/public/data/tales/123/versions`);
    });

    it('taleVersion(tid, vid) returns the correct path', () => {
      expect(PATHS.taleVersion('123', 'v1')).toBe(`${APP_ROOT}/public/data/tales/123/versions/v1`);
    });
  });

  describe('Public Meta & Tags', () => {
    it('featured() returns correct path', () => {
      expect(PATHS.featured()).toBe(`${APP_ROOT}/public/meta/featured`);
    });

    it('globalStats() returns correct path', () => {
      expect(PATHS.globalStats()).toBe(`${APP_ROOT}/public/meta/stats`);
    });

    it('tags() returns correct path', () => {
      expect(PATHS.tags()).toBe(`${APP_ROOT}/public/data/tags`);
    });

    it('tag(name) returns correct path', () => {
      expect(PATHS.tag('fantasy')).toBe(`${APP_ROOT}/public/data/tags/fantasy`);
    });
  });

  describe('User Data & Profile', () => {
    it('user(uid) returns the correct path', () => {
      expect(PATHS.user('abc')).toBe(`${APP_ROOT}/users/abc`);
    });

    it('readerPrefs(uid) returns the correct path', () => {
      expect(PATHS.readerPrefs('abc')).toBe(`${APP_ROOT}/users/abc/preferences/reader`);
    });

    it('bookmarks(uid) returns the correct path', () => {
      expect(PATHS.bookmarks('abc')).toBe(`${APP_ROOT}/users/abc/bookmarks`);
    });

    it('bookmark(uid, tid) returns the correct path', () => {
      expect(PATHS.bookmark('abc', '123')).toBe(`${APP_ROOT}/users/abc/bookmarks/123`);
    });

    it('lists(uid) returns the correct path', () => {
      expect(PATHS.lists('abc')).toBe(`${APP_ROOT}/users/abc/lists`);
    });

    it('list(uid, lid) returns correct path', () => {
      expect(PATHS.list('u1', 'l1')).toBe(`${APP_ROOT}/users/u1/lists/l1`);
    });

    it('listTales(uid, lid) returns correct path', () => {
      expect(PATHS.listTales('u1', 'l1')).toBe(`${APP_ROOT}/users/u1/lists/l1/tales`);
    });

    it('listTale(uid, lid, tid) returns correct path', () => {
      expect(PATHS.listTale('u1', 'l1', 't1')).toBe(`${APP_ROOT}/users/u1/lists/l1/tales/t1`);
    });
  });

  describe('Drafts, Progress & History', () => {
    it('drafts(uid) returns correct path', () => {
      expect(PATHS.drafts('u1')).toBe(`${APP_ROOT}/users/u1/drafts`);
    });

    it('draft(uid, did) returns correct path', () => {
      expect(PATHS.draft('u1', 'd1')).toBe(`${APP_ROOT}/users/u1/drafts/d1`);
    });

    it('draftChapters(uid, did) returns correct path', () => {
      expect(PATHS.draftChapters('u1', 'd1')).toBe(`${APP_ROOT}/users/u1/drafts/d1/chapters`);
    });

    it('draftChapter(uid, did, idx) returns correct path', () => {
      expect(PATHS.draftChapter('u1', 'd1', 0)).toBe(`${APP_ROOT}/users/u1/drafts/d1/chapters/0`);
    });

    it('progressList(uid) returns correct path', () => {
      expect(PATHS.progressList('u1')).toBe(`${APP_ROOT}/users/u1/readerProgress`);
    });

    it('progress(uid, tid) returns correct path', () => {
      expect(PATHS.progress('u1', 't1')).toBe(`${APP_ROOT}/users/u1/readerProgress/t1`);
    });

    it('progressChapters(uid, tid) returns correct path', () => {
      expect(PATHS.progressChapters('u1', 't1')).toBe(
        `${APP_ROOT}/users/u1/readerProgress/t1/chapters`
      );
    });

    it('progressChapter(uid, tid, idx) returns correct path', () => {
      expect(PATHS.progressChapter('u1', 't1', 0)).toBe(
        `${APP_ROOT}/users/u1/readerProgress/t1/chapters/0`
      );
    });

    it('readingHistory(uid) returns correct path', () => {
      expect(PATHS.readingHistory('u1')).toBe(`${APP_ROOT}/users/u1/readingHistory`);
    });

    it('readingHistoryEntry(uid, tid) returns correct path', () => {
      expect(PATHS.readingHistoryEntry('u1', 't1')).toBe(`${APP_ROOT}/users/u1/readingHistory/t1`);
    });
  });

  describe('Social, Notifications & Achievements', () => {
    it('following(uid) returns correct path', () => {
      expect(PATHS.following('u1')).toBe(`${APP_ROOT}/users/u1/following`);
    });

    it('followingEntry(uid, target) returns correct path', () => {
      expect(PATHS.followingEntry('u1', 'u2')).toBe(`${APP_ROOT}/users/u1/following/u2`);
    });

    it('followers(uid) returns correct path', () => {
      expect(PATHS.followers('u1')).toBe(`${APP_ROOT}/users/u1/followers`);
    });

    it('followerEntry(uid, follower) returns correct path', () => {
      expect(PATHS.followerEntry('u1', 'u2')).toBe(`${APP_ROOT}/users/u1/followers/u2`);
    });

    it('notifications(uid) returns correct path', () => {
      expect(PATHS.notifications('u1')).toBe(`${APP_ROOT}/users/u1/notifications`);
    });

    it('notification(uid, nid) returns correct path', () => {
      expect(PATHS.notification('u1', 'n1')).toBe(`${APP_ROOT}/users/u1/notifications/n1`);
    });

    it('achievements(uid) returns correct path', () => {
      expect(PATHS.achievements('u1')).toBe(`${APP_ROOT}/users/u1/achievements`);
    });

    it('achievement(uid, aid) returns correct path', () => {
      expect(PATHS.achievement('u1', 'a1')).toBe(`${APP_ROOT}/users/u1/achievements/a1`);
    });
  });
});
