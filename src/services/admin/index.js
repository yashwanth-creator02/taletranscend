// src/services/admin/index.js
// Barrel for the admin dashboard service layer.

export {
  DASHBOARD_MODULES,
  resolveDashboardAccess,
  getAllowedModules,
  canAccessModule,
  defaultModuleFor,
  roleLabel,
} from './access.service.js';
export { ADMIN_PAGE_SIZE, fetchAdminPage } from './pagination.service.js';
export { writeAdminAuditLog, listAdminAuditLogPage } from './audit.service.js';
