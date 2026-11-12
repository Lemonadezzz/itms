import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getRoleDefinition, isTechnicianRole, type RoleKey } from '@/lib/roles';
import {
  hasPermission,
  permissionKey,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/permissions';

export type Access = {
  userId: string;
  name: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  isDeveloper: boolean;
  isTechnician: boolean;
};

export async function getAccess(): Promise<Access | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const roleKey = (session.user.role ?? 'user') as RoleKey;
  const definition = getRoleDefinition(roleKey);
  const permissions =
    Array.isArray(session.user.permissions) && session.user.permissions.length > 0
      ? session.user.permissions
      : definition.permissions;

  return {
    userId: session.user.id,
    name: session.user.name ?? 'system',
    roleKey,
    roleName: definition.name,
    permissions,
    isDeveloper: roleKey === 'developer',
    isTechnician: isTechnicianRole(roleKey),
  };
}

/** Any authenticated user. Used by My Tickets and My Devices & Software. */
export async function requireSignedIn(): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect('/login');
  return access;
}

/** Where a signed-in user should land when the requested page is not allowed. */
export async function landingPath(): Promise<string> {
  const access = await getAccess();
  if (!access) return '/login';
  return hasPermission(access.permissions, permissionKey('assets', 'view'))
    ? '/assets-overview'
    : '/support/my-tickets';
}

/** Page-level guard. Redirects unauthenticated users to login and unauthorized users to My Tickets. */
export async function requirePageAccess(
  moduleKey: PermissionModule,
  action: PermissionAction = 'view'
): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect('/login');
  if (!hasPermission(access.permissions, permissionKey(moduleKey, action))) {
    redirect('/support/my-tickets');
  }
  return access;
}

export type GuardResult =
  | { ok: true; access: Access }
  | { ok: false; error: string };

/** Action-level guard. Returns an ActionResult-shaped failure instead of throwing. */
export async function guardAction(
  moduleKey: PermissionModule,
  action: PermissionAction
): Promise<GuardResult> {
  const access = await getAccess();
  if (!access) return { ok: false, error: 'You must be signed in to perform this action.' };
  if (!hasPermission(access.permissions, permissionKey(moduleKey, action))) {
    return { ok: false, error: 'You do not have permission to perform this action.' };
  }
  return { ok: true, access };
}
