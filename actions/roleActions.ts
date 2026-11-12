'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/mongoose';
import { Role } from '@/models/Role';
import { guardAction } from '@/lib/access';
import { writeLog } from '@/lib/activityLog';
import { normalizePermissions, permissionKey, PERMISSION_MODULES } from '@/lib/permissions';
import { getRoleDefinition } from '@/lib/roles';
import { UpdateRolePermissionsSchema } from '@/lib/validations';
import type { ActionResult } from '@/types';

export async function updateRolePermissions(formData: unknown): Promise<ActionResult> {
  const guard = await guardAction('access', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = UpdateRolePermissionsSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  const { roleKey, permissions } = parsed.data;
  const definition = getRoleDefinition(roleKey);
  if (!definition.editable) {
    return { success: false, error: 'This role is locked and cannot be modified.' };
  }

  // Admins never receive permanent-delete rights.
  const sanitized = permissions.filter((key) => !key.endsWith('.delete'));
  const next = normalizePermissions(sanitized);

  await connectDB();
  const role = await Role.findOne({ key: roleKey });
  if (!role) return { success: false, error: 'Role not found. Run the access control seed script.' };

  role.permissions = next;
  await role.save();

  const granted = PERMISSION_MODULES.flatMap((module) =>
    next.includes(permissionKey(module.key, 'view')) ? [module.label] : []
  );

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'update',
    description: `Updated ${definition.name} permissions: ${granted.join(', ') || 'none'}`,
    relatedModel: 'Role',
    relatedId: role._id.toString(),
  });

  revalidatePath('/access-management/roles');
  revalidatePath('/access-management/permissions');
  return { success: true, data: undefined };
}
