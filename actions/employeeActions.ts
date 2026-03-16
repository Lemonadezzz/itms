'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Employee } from '@/models/Employee';
import { CreateEmployeeSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

export async function createEmployee(formData: unknown): Promise<ActionResult<string>> {
  const parsed = CreateEmployeeSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const emp = await Employee.create(parsed.data);
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'create', description: `Created employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: emp._id.toString() });
  revalidatePath('/employees');
  return { success: true, data: emp._id.toString() };
}

export async function updateEmployee(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = CreateEmployeeSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const emp = await Employee.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!emp) return { success: false, error: 'Employee not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Updated employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: id });
  revalidatePath('/employees');
  return { success: true, data: undefined };
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  await connectDB();
  const emp = await Employee.findByIdAndDelete(id);
  const { userId, userName } = await getActor();
  if (emp) await writeLog({ userId, userName, action: 'delete', description: `Deleted employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: id });
  revalidatePath('/employees');
  return { success: true, data: undefined };
}
