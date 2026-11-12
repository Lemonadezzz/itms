'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Department } from '@/models/Department';
import { Employee } from '@/models/Employee';
import { CreateDepartmentSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

export async function createDepartment(formData: unknown): Promise<ActionResult<string>> {
  const parsed = CreateDepartmentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  let dept;
  try {
    dept = await Department.create(parsed.data);
  } catch (err: any) {
    if (err?.code === 11000) return { success: false, error: 'A department with this name already exists.' };
    throw err;
  }

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'create', description: `Created department ${dept.departmentName}`, relatedModel: 'Department', relatedId: dept._id.toString() });
  revalidatePath('/departments');
  revalidatePath('/employees');
  revalidatePath('/end-user-management');
  return { success: true, data: dept._id.toString() };
}

export async function updateDepartment(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = CreateDepartmentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  const { description, ...required } = parsed.data;
  const update = description === undefined
    ? { $set: required, $unset: { description: '' } }
    : { $set: { ...required, description } };

  await connectDB();
  let dept;
  try {
    dept = await Department.findByIdAndUpdate(id, update, { new: true });
  } catch (err: any) {
    if (err?.code === 11000) return { success: false, error: 'A department with this name already exists.' };
    throw err;
  }
  if (!dept) return { success: false, error: 'Department not found' };

  // Keep the denormalized department name on linked employees in sync.
  await Employee.updateMany({ departmentId: id }, { $set: { department: dept.departmentName } });

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Updated department ${dept.departmentName}`, relatedModel: 'Department', relatedId: id });
  revalidatePath('/departments');
  revalidatePath('/employees');
  revalidatePath('/end-user-management');
  return { success: true, data: undefined };
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  await connectDB();
  const dept = await Department.findById(id);
  if (!dept) return { success: false, error: 'Department not found' };

  const employeeCount = await Employee.countDocuments({ departmentId: id });
  if (employeeCount > 0) {
    return {
      success: false,
      error: `Cannot delete this department: ${employeeCount} employee${employeeCount === 1 ? ' is' : 's are'} still assigned to it.`,
    };
  }

  await Department.findByIdAndDelete(id);

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'delete', description: `Deleted department ${dept.departmentName}`, relatedModel: 'Department', relatedId: id });
  revalidatePath('/departments');
  revalidatePath('/employees');
  revalidatePath('/end-user-management');
  return { success: true, data: undefined };
}
