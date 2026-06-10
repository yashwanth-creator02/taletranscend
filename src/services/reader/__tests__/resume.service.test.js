import { describe, it, expect } from 'vitest';
import { determineResumePoint } from '../resume.service.js';

describe('resume.service', () => {
  it('resumes from cloud progress when ahead of local', () => {
    const local = { chapterIndex: 1, percent: 30 };
    const cloud = { chapterIndex: 3, percent: 10 };

    const result = determineResumePoint(local, cloud);
    expect(result.chapterIndex).toBe(3);
    expect(result.source).toBe('cloud');
  });

  it('resumes from local progress when ahead of cloud', () => {
    const local = { chapterIndex: 5, percent: 50 };
    const cloud = { chapterIndex: 2, percent: 80 };

    const result = determineResumePoint(local, cloud);
    expect(result.chapterIndex).toBe(5);
    expect(result.source).toBe('local');
  });

  it('defaults to chapter 0 when no progress exists', () => {
    const result = determineResumePoint(null, null);
    expect(result.chapterIndex).toBe(0);
    expect(result.source).toBe('start');
  });

  it('uses local when cloud is null', () => {
    const local = { chapterIndex: 2, percent: 45 };
    const result = determineResumePoint(local, null);
    expect(result.chapterIndex).toBe(2);
    expect(result.source).toBe('local');
  });
});
