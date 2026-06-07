import { describe, it, expect, beforeEach, vi } from 'vitest';
import { libraryState } from '../state.js';
import { loadTalesPage, nextPage, prevPage } from '../content.js';

// Mock the service
vi.mock('@services/index.js', () => ({
  getTalesPageNumbered: vi.fn(({ page, perPage }) => {
    const total = 8;
    const tales = Array.from(
      { length: Math.min(perPage, total - (page - 1) * perPage) },
      (_, i) => ({
        id: `tale-${(page - 1) * perPage + i + 1}`,
        title: `Tale ${(page - 1) * perPage + i + 1}`,
      })
    );

    return Promise.resolve({
      tales,
      total,
      hasMore: page * perPage < total,
    });
  }),
}));

describe('library pagination', () => {
  beforeEach(() => {
    libraryState.allTales = [];
    libraryState.totalTales = 0;
    libraryState.currentPage = 1;
    libraryState.isLoading = false;
  });

  it('loads page 1 correctly', async () => {
    const result = await loadTalesPage(1);

    // Default talesPerPage is 2 in state.js as per previous edit
    expect(result.tales).toHaveLength(2);
    expect(result.total).toBe(8);
    expect(libraryState.currentPage).toBe(1);
  });

  it('navigates to next page', async () => {
    await loadTalesPage(1);
    libraryState.talesPerPage = 4; // Force smaller pages

    const result = await nextPage();

    expect(libraryState.currentPage).toBe(2);
    expect(result.tales).toHaveLength(4);
  });

  it('navigates to previous page', async () => {
    libraryState.talesPerPage = 4;
    await loadTalesPage(2);

    const result = await prevPage();

    expect(libraryState.currentPage).toBe(1);
  });

  it('does not go below page 1', async () => {
    await loadTalesPage(1);

    const result = await prevPage();

    expect(libraryState.currentPage).toBe(1);
  });
});
