// src/services/reader/__tests__/getTotalReadTimes.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTotalReadTimes } from '../getTotalReadTimes.service.js';
import { getTotalReadTime } from '../readTime.selector.js';

vi.mock('../readTime.selector.js', () => ({
  getTotalReadTime: vi.fn(),
}));

describe('GetTotalReadTimes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object if inputs are invalid', async () => {
    expect(await getTotalReadTimes({ userId: null, taleIds: ['t1'] })).toEqual({});
    expect(await getTotalReadTimes({ userId: 'u1', taleIds: null })).toEqual({});
    expect(await getTotalReadTimes({ userId: 'u1', taleIds: [] })).toEqual({});
  });

  it('returns a map of tale read times', async () => {
    vi.mocked(getTotalReadTime).mockImplementation(async ({ taleId }) => {
      if (taleId === 't1') return 1000;
      if (taleId === 't2') return 2000;
      return 0;
    });

    const result = await getTotalReadTimes({ userId: 'u1', taleIds: ['t1', 't2'] });
    expect(result).toEqual({
      t1: 1000,
      t2: 2000,
    });
    expect(getTotalReadTime).toHaveBeenCalledTimes(2);
  });
});
