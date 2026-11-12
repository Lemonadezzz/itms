export const PERMISSION_MODULES = [
  { key: 'assets', label: 'Assets' },
  { key: 'employees', label: 'Employees' },
  { key: 'departments', label: 'Departments' },
  { key: 'software', label: 'Software' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'knowledge', label: 'Knowledge Base' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'support', label: 'Support Configuration' },
  { key: 'logs', label: 'Logs' },
  { key: 'access', label: 'Access Management' },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]['key'];

export const PERMISSION_ACTIONS = ['view', 'manage', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  assets: ['view', 'manage', 'delete'],
  employees: ['view', 'manage', 'delete'],
  departments: ['view', 'manage', 'delete'],
  software: ['view', 'manage', 'delete'],
  contracts: ['view', 'manage', 'delete'],
  suppliers: ['view', 'manage', 'delete'],
  tickets: ['view', 'manage', 'delete'],
  knowledge: ['view', 'manage', 'delete'],
  reports: ['view'],
  support: ['view', 'manage'],
  logs: ['view'],
  access: ['view', 'manage'],
};

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  manage: 'Manage',
  delete: 'Delete',
};

export function permissionKey(moduleKey: PermissionModule, action: PermissionAction): string {
  return `${moduleKey}.${action}`;
}

export function permissionLabel(key: string): string {
  const [moduleKey, action] = key.split('.') as [PermissionModule, PermissionAction];
  const moduleLabel = PERMISSION_MODULES.find((m) => m.key === moduleKey)?.label ?? moduleKey;
  return `${moduleLabel} · ${PERMISSION_ACTION_LABELS[action] ?? action}`;
}

export const ALL_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap((module) =>
  MODULE_ACTIONS[module.key].map((action) => permissionKey(module.key, action))
);

/** View + manage for every module, never delete. */
export const MANAGE_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap((module) =>
  MODULE_ACTIONS[module.key]
    .filter((action) => action !== 'delete')
    .map((action) => permissionKey(module.key, action))
);

/** View only for every module a regular user should see. Access Management stays admin-only. */
export const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSIONS);

export function hasPermission(permissions: string[] | undefined, key: string): boolean {
  return !!permissions?.includes(key);
}

/** Ensure manage implies view and drop anything that is not in the catalog. */
export function normalizePermissions(permissions: string[]): string[] {
  const next = new Set(permissions.filter((key) => ALL_PERMISSIONS_SET.has(key)));
  for (const module of PERMISSION_MODULES) {
    if (next.has(permissionKey(module.key, 'manage'))) {
      next.add(permissionKey(module.key, 'view'));
    }
  }
  return [...next].sort();
}
