import { describe, expect, it, vi, beforeEach } from 'vitest';
import { listDeletionRequestsPage, decideDeletionRequest } from '../deletion.service.js';
import { fetchAdminPage } from '../pagination.service.js';
import { writeAdminAuditLog } from '../audit.service.js';

vi.mock('../pagination.service.js', () => ({
  fetchAdminPage: vi.fn(),
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: vi.fn().mockResolvedValue({ success: true }),
}));

const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('@fb/index.js', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    deletionRequests: vi.fn().mockReturnValue({}),
    deletionRequest: vi.fn(),
  },
}));

describe('deletion service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a paginated page of pending deletion requests', async () => {
    vi.mocked(fetchAdminPage).mockResolvedValue({
      items: [{ id: 'req-1', userId: 'user-1', taleId: 'tale-1' }],
      lastDoc: null,
      hasMore: false,
    });

    const result = await listDeletionRequestsPage();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('req-1');
  });

  it('writes an audit log entry when deciding a request', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ userId: 'admin-1', taleId: 'tale-1' }),
      id: 'req-1',
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    await decideDeletionRequest('req-1', 'approved');

    expect(writeAdminAuditLog).toHaveBeenCalled();
    expect(writeAdminAuditLog.mock.calls[0][0]).toMatchObject({
      action: 'deletion.approved',
      targetType: 'deletionRequest',
    });
  });
});
