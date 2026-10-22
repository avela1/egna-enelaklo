/**
 * Permission keys.
 *
 * Authorisation is enforced on the server with these keys. A role is only the
 * coarse grouping of permissions; a request always checks the key, never the
 * role name.
 */
export const PERMISSIONS = {
  TASKS_VIEW: 'tasks.view',
  QUOTES_EDIT: 'quotes.edit',
  TASKERS_ASSIGN: 'taskers.assign',
  TASKERS_VERIFY: 'taskers.verify',
  EXCEPTIONS_RESOLVE: 'exceptions.resolve',
  REFUNDS_APPROVE: 'refunds.approve',
  PAYMENTS_VIEW: 'payments.view',
  REPORTS_VIEW: 'reports.view',
  CATALOG_EDIT: 'catalog.edit',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_VIEW: 'audit.view',
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_KEYS = Object.values(PERMISSIONS) as [PermissionKey, ...PermissionKey[]];

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  [PERMISSIONS.TASKS_VIEW]: 'See the task list and the task details',
  [PERMISSIONS.QUOTES_EDIT]: 'Review tasks and send quotes',
  [PERMISSIONS.TASKERS_ASSIGN]: 'Assign a tasker to a task',
  [PERMISSIONS.TASKERS_VERIFY]: 'Verify a tasker and their documents',
  [PERMISSIONS.EXCEPTIONS_RESOLVE]: 'Resolve exceptions, refunds and disputes',
  [PERMISSIONS.REFUNDS_APPROVE]: 'Approve refunds and budget releases',
  [PERMISSIONS.PAYMENTS_VIEW]: 'See payments and reconciliation',
  [PERMISSIONS.REPORTS_VIEW]: 'See the operational reports',
  [PERMISSIONS.CATALOG_EDIT]: 'Edit the service catalogue and its templates',
  [PERMISSIONS.USERS_MANAGE]: 'Invite, disable and re-role staff users',
  [PERMISSIONS.ROLES_MANAGE]: 'Change which permissions a role has',
  [PERMISSIONS.AUDIT_VIEW]: 'Read and export the audit log',
  [PERMISSIONS.SETTINGS_MANAGE]: 'Change the platform settings',
};

/** Roles that only exist to group permissions. */
export const STAFF_ROLE_NAMES = ['OPERATIONS', 'FINANCE', 'ADMIN'] as const;

/**
 * The permissions each role has by default. The database holds the real
 * mapping; this is the seed and the fallback for a fresh install.
 */
export const ROLE_PERMISSION_DEFAULTS: Record<string, readonly PermissionKey[]> = {
  CUSTOMER: [],
  TASKER: [],
  OPERATIONS: [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.QUOTES_EDIT,
    PERMISSIONS.TASKERS_ASSIGN,
    PERMISSIONS.TASKERS_VERIFY,
    PERMISSIONS.EXCEPTIONS_RESOLVE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  FINANCE: [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.REFUNDS_APPROVE,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
  ADMIN: PERMISSION_KEYS,
};

/** The portal a signed in user lands on, by role. */
export const PORTAL_BY_ROLE: Record<string, string> = {
  CUSTOMER: '/app',
  TASKER: '/tasker',
  OPERATIONS: '/staff',
  FINANCE: '/staff',
  ADMIN: '/staff',
};
