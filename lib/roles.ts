import { ALL_PERMISSIONS, MANAGE_PERMISSIONS, permissionKey } from './permissions';

export const ROLE_KEYS = ['developer', 'super_admin', 'admin', 'user'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** Roles that can be assigned tickets and resolve/close them. */
export const TECHNICIAN_ROLES: RoleKey[] = ['developer', 'super_admin'];

export function isTechnicianRole(roleKey: string): boolean {
  return (TECHNICIAN_ROLES as string[]).includes(roleKey);
}

/** Admins configure support and view reports, but handle tickets read-only. */
const ADMIN_PERMISSIONS = MANAGE_PERMISSIONS.filter(
  (key) => key !== permissionKey('tickets', 'manage')
);

const USER_PERMISSIONS = [permissionKey('knowledge', 'view')];

export type RoleDefinition = {
  key: RoleKey;
  name: string;
  description: string;
  permissions: string[];
  /** Only the Admin role's permission set can be edited. */
  editable: boolean;
};

export const ROLE_DEFINITIONS: Record<RoleKey, RoleDefinition> = {
  developer: {
    key: 'developer',
    name: 'Developer',
    description: 'Absolute full access, including permanent deletion.',
    permissions: ALL_PERMISSIONS,
    editable: false,
  },
  super_admin: {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Technician with full access to every module, but no permanent deletion.',
    permissions: MANAGE_PERMISSIONS,
    editable: false,
  },
  admin: {
    key: 'admin',
    name: 'Admin',
    description: 'Configurable module access, reports, and support configuration. Never includes permanent deletion.',
    permissions: ADMIN_PERMISSIONS,
    editable: true,
  },
  user: {
    key: 'user',
    name: 'User',
    description: 'My Tickets, My Devices & Software, and the Knowledge Base only.',
    permissions: USER_PERMISSIONS,
    editable: false,
  },
};

export const ROLE_ORDER = ROLE_KEYS;

export function getRoleDefinition(key: string): RoleDefinition {
  return ROLE_DEFINITIONS[(key as RoleKey)] ?? ROLE_DEFINITIONS.user;
}
