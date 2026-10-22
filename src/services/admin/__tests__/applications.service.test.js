import { describe, expect, it, vi, beforeEach } from 'vitest';
import { listApplicationsPage, decideApplication } from '../applications.service.js';
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
    authorApplications: vi.fn(),
    authorApplication: vi.fn(),
  },
}));

describe('applications service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a paginated page of pending applications', async () => {
    vi.mocked(fetchAdminPage).mockResolvedValue({
      items: [{ id: 'app-1', penName: 'Test Author', status: 'pending' }],
      lastDoc: null,
      hasMore: false,
    });

    const result = await listApplicationsPage();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].penName).toBe('Test Author');
  });

  it('writes an audit log entry when deciding an application', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ applicantId: 'admin-1', penName: 'New Author' }),
      id: 'app-1',
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    await decideApplication('app-1', 'approved');

    expect(writeAdminAuditLog).toHaveBeenCalled();
    expect(writeAdminAuditLog.mock.calls[0][0]).toMatchObject({
      action: 'application.approved',
      targetType: 'authorApplication',
    });
  });
});
