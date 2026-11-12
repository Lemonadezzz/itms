'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/models/User';
import { Employee } from '@/models/Employee';
import { getAccess, guardAction } from '@/lib/access';
import { writeLog } from '@/lib/activityLog';
import { CreateAccountSchema, UpdateAccountSchema } from '@/lib/validations';
import type { ActionResult } from '@/types';

const ACCOUNTS_PATH = '/access-management/user-accounts';

export async function createAccount(formData: unknown): Promise<ActionResult<string>> {
  const guard = await guardAction('access', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = CreateAccountSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const { employeeId, name, email, password, roleKey } = parsed.data;

  if (roleKey === 'developer' && !guard.access.isDeveloper) {
    return { success: false, error: 'Only a Developer can create a Developer account.' };
  }

  if (employeeId) {
    const employee = await Employee.findById(employeeId).select('employeeName').lean();
    if (!employee) return { success: false, error: 'Employee not found.' };

    const existing = await User.findOne({ employeeId }).select('_id').lean();
    if (existing) return { success: false, error: 'This employee already has an account.' };
  }

  const emailTaken = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
  if (emailTaken) return { success: false, error: 'An account with this email already exists.' };

  const passwordHash = await bcrypt.hash(password, 12);
  const account = await User.create({
    name,
    email: email.toLowerCase(),
    password: passwordHash,
    employeeId: employeeId || undefined,
    roleKey,
    status: 'Active',
  });

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'create',
    description: `Created user account ${email} with role ${roleKey}`,
    relatedModel: 'User',
    relatedId: account._id.toString(),
  });

  revalidatePath(ACCOUNTS_PATH);
  revalidatePath('/access-management/roles');
  return { success: true, data: account._id.toString() };
}

export async function updateAccount(id: string, formData: unknown): Promise<ActionResult> {
  const guard = await guardAction('access', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = UpdateAccountSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const account = await User.findById(id).select('+password');
  if (!account) return { success: false, error: 'Account not found.' };

  const { roleKey, status, password } = parsed.data;
  const isSelf = account._id.toString() === guard.access.userId;

  if (!guard.access.isDeveloper) {
    if (account.roleKey === 'developer') {
      return { success: false, error: 'Only a Developer can modify a Developer account.' };
    }
    if (roleKey === 'developer') {
      return { success: false, error: 'Only a Developer can assign the Developer role.' };
    }
  }

  if (isSelf && status === 'Inactive') {
    return { success: false, error: 'You cannot deactivate your own account.' };
  }
  if (isSelf && roleKey !== account.roleKey && !guard.access.isDeveloper) {
    return { success: false, error: 'You cannot change your own role.' };
  }

  const update: Record<string, unknown> = { roleKey, status };
  if (password) update.password = await bcrypt.hash(password, 12);

  await User.updateOne({ _id: id }, { $set: update });

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'update',
    description: `Updated user account ${account.email} (role ${roleKey}, ${status})`,
    relatedModel: 'User',
    relatedId: id,
  });

  revalidatePath(ACCOUNTS_PATH);
  revalidatePath('/access-management/roles');
  return { success: true, data: undefined };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const access = await getAccess();
  if (!access) return { success: false, error: 'You must be signed in to perform this action.' };
  if (!access.isDeveloper) {
    return { success: false, error: 'Only a Developer can permanently delete an account.' };
  }
  if (id === access.userId) {
    return { success: false, error: 'You cannot delete your own account.' };
  }

  await connectDB();
  const account = await User.findByIdAndDelete(id);
  if (!account) return { success: false, error: 'Account not found.' };

  await writeLog({
    userId: access.userId,
    userName: access.name,
    action: 'delete',
    description: `Deleted user account ${account.email}`,
    relatedModel: 'User',
    relatedId: id,
  });

  revalidatePath(ACCOUNTS_PATH);
  revalidatePath('/access-management/roles');
  return { success: true, data: undefined };
}
