// src/services/__tests__/inquiry.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTimestampMs,
  mergeInquiries,
  fetchAuthorInquiries,
  subscribeAuthorInquiries,
  fetchReaderInquiries,
  subscribeReaderInquiries,
  createInquiry,
  replyToInquiry,
  reportInquiry,
  blockInquirySender,
} from '../inquiry.service.js';
import * as fb from '@fb/index.js';

vi.mock('@fb/index.js', () => ({
  refs: {
    inquiries: vi.fn(() => ({ path: 'inquiries' })),
    inquiry: vi.fn((id) => ({ path: `inquiries/${id}` })),
  },
  addDoc: vi.fn(() => Promise.resolve({ id: 'doc-inq-123' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((field, op, val) => ({ type: 'where', field, op, val })),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    safeAsync: vi.fn(async (p, options = {}) => {
      try {
        return await p;
      } catch (err) {
        if (options.fallback !== undefined) return options.fallback;
        throw err;
      }
    }),
    createLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  };
});

describe('Inquiry Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTimestampMs', () => {
    it('returns 0 for missing or invalid timestamps', () => {
      expect(getTimestampMs(null)).toBe(0);
      expect(getTimestampMs({})).toBe(0);
      expect(getTimestampMs({ createdAt: 'invalid-date' })).toBe(0);
    });

    it('extracts ms from Firestore Timestamp with toMillis()', () => {
      const item = {
        createdAt: {
          toMillis: () => 1700000000000,
        },
      };
      expect(getTimestampMs(item)).toBe(1700000000000);
    });

    it('extracts ms from Firestore object with seconds and nanoseconds', () => {
      const item = {
        createdAt: {
          seconds: 1700000000,
          nanoseconds: 500000000,
        },
      };
      expect(getTimestampMs(item)).toBe(1700000000500);
    });

    it('extracts ms from ISO string or timestamp fallback', () => {
      const iso = '2026-10-14T10:00:00.000Z';
      const expected = new Date(iso).getTime();
      expect(getTimestampMs({ createdAt: iso })).toBe(expected);
      expect(getTimestampMs({ timestamp: iso })).toBe(expected);
    });
  });

  describe('mergeInquiries', () => {
    it('merges local and remote inquiries and deduplicates optimistic items', () => {
      const local = [
        {
          id: 1700000000000,
          senderId: 'user-1',
          message: 'Hello Scribe',
          status: 'sent',
          createdAt: '2026-10-14T10:00:00.000Z',
        },
      ];
      const remote = [
        {
          id: 'firestore-doc-1',
          senderId: 'user-1',
          message: 'Hello Scribe',
          status: 'replied',
          replyText: 'Greetings Traveler',
          createdAt: '2026-10-14T10:00:00.000Z',
        },
      ];

      const merged = mergeInquiries(local, remote);
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe('firestore-doc-1');
      expect(merged[0].status).toBe('replied');
      expect(merged[0].replyText).toBe('Greetings Traveler');
    });

    it('sorts merged inquiries by date descending', () => {
      const remote = [
        { id: 'inq-old', createdAt: '2026-10-12T10:00:00.000Z' },
        { id: 'inq-new', createdAt: '2026-10-14T10:00:00.000Z' },
      ];
      const merged = mergeInquiries([], remote);
      expect(merged[0].id).toBe('inq-new');
      expect(merged[1].id).toBe('inq-old');
    });
  });

  describe('fetchAuthorInquiries', () => {
    it('returns empty array if taleId or authorId is missing', async () => {
      expect(await fetchAuthorInquiries('', 'author-1')).toEqual([]);
      expect(await fetchAuthorInquiries('tale-1', '')).toEqual([]);
      expect(await fetchAuthorInquiries('tale-1', 'anonymous')).toEqual([]);
    });

    it('queries Firestore and returns mapped documents', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        docs: [
          {
            id: 'inq-1',
            data: () => ({
              taleId: 'tale-1',
              authorId: 'author-1',
              message: 'Doubts about chapter 2',
              createdAt: '2026-10-14T11:00:00.000Z',
            }),
          },
        ],
      });

      const list = await fetchAuthorInquiries('tale-1', 'author-1');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('inq-1');
      expect(list[0].message).toBe('Doubts about chapter 2');
    });
  });

  describe('subscribeAuthorInquiries', () => {
    it('returns noop unsubscribe if missing parameters', () => {
      const unsub = subscribeAuthorInquiries('', 'author-1', vi.fn());
      expect(typeof unsub).toBe('function');
      expect(fb.onSnapshot).not.toHaveBeenCalled();
    });

    it('attaches onSnapshot listener and notifies callback', () => {
      const mockUnsub = vi.fn();
      vi.mocked(fb.onSnapshot).mockImplementation((q, onNext) => {
        onNext({
          docs: [
            {
              id: 'inq-live-1',
              data: () => ({
                taleId: 'tale-1',
                authorId: 'author-1',
                message: 'Live stream inquiry',
                createdAt: '2026-10-14T11:30:00.000Z',
              }),
            },
          ],
        });
        return mockUnsub;
      });

      const onUpdate = vi.fn();
      const unsub = subscribeAuthorInquiries('tale-1', 'author-1', onUpdate);

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'inq-live-1',
          message: 'Live stream inquiry',
        }),
      ]);
      expect(unsub).toBe(mockUnsub);
    });
  });

  describe('fetchReaderInquiries', () => {
    it('returns empty array if taleId or senderId is missing or anonymous', async () => {
      expect(await fetchReaderInquiries('', 'user-1')).toEqual([]);
      expect(await fetchReaderInquiries('tale-1', '')).toEqual([]);
      expect(await fetchReaderInquiries('tale-1', 'anonymous')).toEqual([]);
    });

    it('queries Firestore with senderId and taleId', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        docs: [
          {
            id: 'inq-reader-1',
            data: () => ({
              taleId: 'tale-1',
              senderId: 'user-1',
              message: 'My dispatched question',
              createdAt: '2026-10-14T09:00:00.000Z',
            }),
          },
        ],
      });

      const list = await fetchReaderInquiries('tale-1', 'user-1');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('inq-reader-1');
    });
  });

  describe('subscribeReaderInquiries', () => {
    it('returns noop unsubscribe if missing parameters', () => {
      const unsub = subscribeReaderInquiries('', 'user-1', vi.fn());
      expect(typeof unsub).toBe('function');
      expect(fb.onSnapshot).not.toHaveBeenCalled();
    });

    it('attaches onSnapshot listener and notifies callback', () => {
      const mockUnsub = vi.fn();
      vi.mocked(fb.onSnapshot).mockImplementation((q, onNext) => {
        onNext({
          docs: [
            {
              id: 'inq-reader-stream-1',
              data: () => ({
                taleId: 'tale-1',
                senderId: 'user-1',
                message: 'Streamed reader inquiry',
                createdAt: '2026-10-14T10:00:00.000Z',
              }),
            },
          ],
        });
        return mockUnsub;
      });

      const onUpdate = vi.fn();
      const unsub = subscribeReaderInquiries('tale-1', 'user-1', onUpdate);

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'inq-reader-stream-1',
          message: 'Streamed reader inquiry',
        }),
      ]);
      expect(unsub).toBe(mockUnsub);
    });
  });

  describe('createInquiry', () => {
    it('throws if required fields are missing', async () => {
      await expect(
        createInquiry({ taleId: '', authorId: 'a', senderId: 's', message: 'm' })
      ).rejects.toThrow('Missing mandatory fields');
      await expect(
        createInquiry({ taleId: 't', authorId: '', senderId: 's', message: 'm' })
      ).rejects.toThrow('Missing mandatory fields');
      await expect(
        createInquiry({ taleId: 't', authorId: 'a', senderId: '', message: 'm' })
      ).rejects.toThrow('Missing mandatory fields');
      await expect(
        createInquiry({ taleId: 't', authorId: 'a', senderId: 's', message: '' })
      ).rejects.toThrow('Missing mandatory fields');
    });

    it('calls addDoc and returns inquiry with id', async () => {
      const res = await createInquiry({
        taleId: 'tale-1',
        authorId: 'author-1',
        senderId: 'reader-1',
        senderMoniker: 'Curious Reader',
        category: 'plot',
        message: 'Is the protagonist the true heir?',
      });

      expect(fb.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          taleId: 'tale-1',
          authorId: 'author-1',
          senderId: 'reader-1',
          senderMoniker: 'Curious Reader',
          category: 'plot',
          message: 'Is the protagonist the true heir?',
          status: 'sent',
        })
      );
      expect(res.id).toBe('doc-inq-123');
    });
  });

  describe('replyToInquiry, reportInquiry, blockInquirySender', () => {
    it('replyToInquiry throws on missing parameters and calls updateDoc', async () => {
      await expect(replyToInquiry('', { replyText: 'Hi' })).rejects.toThrow();
      await expect(replyToInquiry('inq-1', { replyText: '' })).rejects.toThrow();

      await replyToInquiry('inq-1', {
        replyText: 'The heir was hidden away.',
        authorName: 'Scribe Ronin',
      });
      expect(fb.updateDoc).toHaveBeenCalledWith(
        { path: 'inquiries/inq-1' },
        expect.objectContaining({
          status: 'replied',
          replyText: 'The heir was hidden away.',
          replyAuthorName: 'Scribe Ronin',
        })
      );
    });

    it('reportInquiry updates status to reported', async () => {
      await reportInquiry('inq-report');
      expect(fb.updateDoc).toHaveBeenCalledWith(
        { path: 'inquiries/inq-report' },
        expect.objectContaining({
          status: 'reported',
          isReported: true,
        })
      );
    });

    it('blockInquirySender updates status to blocked', async () => {
      await blockInquirySender('inq-block');
      expect(fb.updateDoc).toHaveBeenCalledWith(
        { path: 'inquiries/inq-block' },
        expect.objectContaining({
          status: 'blocked',
          isBlocked: true,
        })
      );
    });
  });
});
