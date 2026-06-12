// src/services/reader/__tests__/readTime.selector.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTotalReadTime } from '../readTime.selector.js';
import { getLocalTotalReadTime } from '../localProgress.service.js';
import { getCloudProgress } from '../cloudProgress.service.js';

vi.mock('../localProgress.service.js', () => ({
  getLocalTotalReadTime: vi.fn(),
}));

vi.mock('../cloudProgress.service.js', () => ({
  getCloudProgress: vi.fn(),
}));

describe('ReadTimeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 if userId or taleId is missing', async () => {
    expect(await getTotalReadTime({ userId: null, taleId: 't1' })).toBe(0);
    expect(await getTotalReadTime({ userId: 'u1', taleId: null })).toBe(0);
  });

  it('returns the maximum of local and cloud read times', async () => {
    vi.mocked(getLocalTotalReadTime).mockReturnValue(5000);
    vi.mocked(getCloudProgress).mockResolvedValue({ totalReadTimeMs: 10000 });

    const result = await getTotalReadTime({ userId: 'u1', taleId: 't1' });
    expect(result).toBe(10000);
  });

  it('returns local time if cloud time is lower', async () => {
    vi.mocked(getLocalTotalReadTime).mockReturnValue(15000);
    vi.mocked(getCloudProgress).mockResolvedValue({ totalReadTimeMs: 10000 });

    const result = await getTotalReadTime({ userId: 'u1', taleId: 't1' });
    expect(result).toBe(15000);
  });

  it('handles missing cloud progress', async () => {
    vi.mocked(getLocalTotalReadTime).mockReturnValue(5000);
    vi.mocked(getCloudProgress).mockResolvedValue(null);

    const result = await getTotalReadTime({ userId: 'u1', taleId: 't1' });
    expect(result).toBe(5000);
  });
});
