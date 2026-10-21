/**
 * Access roles.
 *
 * Authorisation is enforced on the server with permission keys
 * (see docs/api-conventions.md). Roles are only the coarse grouping.
 */
export const Role = {
  CUSTOMER: 'CUSTOMER',
  TASKER: 'TASKER',
  OPERATIONS: 'OPERATIONS',
  FINANCE: 'FINANCE',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_VALUES = Object.values(Role) as [Role, ...Role[]];

export const STAFF_ROLES: readonly Role[] = [Role.OPERATIONS, Role.FINANCE, Role.ADMIN];
