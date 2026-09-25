'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Employee } from '@/models/Employee';
import { Asset } from '@/models/Asset';
import { CreateEmployeeSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import { returnAsset } from '@/actions/assetActions';
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

export async function checkEmployeeAssets(employeeId: string): Promise<ActionResult<{ assetCount: number; assets: Array<{ _id: string; assetCode: string; assetName: string; }> }>> {
  await connectDB();
  const assets = await Asset.find(
    {
      'currentAssignment.employeeId': employeeId,
      status: 'In Use',
    },
    { _id: 1, assetCode: 1, assetName: 1 }
  ).lean();
  return { success: true, data: { assetCount: assets.length, assets: assets.map((a) => ({ _id: a._id.toString(), assetCode: a.assetCode, assetName: a.assetName })) } };
}

export async function offboardEmployee(employeeId: string, autoReturn?: boolean): Promise<ActionResult> {
  await connectDB();
  const emp = await Employee.findById(employeeId);
  if (!emp) return { success: false, error: 'Employee not found' };

  const assets = await Asset.find(
    { 'currentAssignment.employeeId': employeeId, status: 'In Use' }
  );

  if (assets.length > 0 && !autoReturn) {
    return { success: false, error: 'BLOCKED: Employee has assigned assets. Please return assets before offboarding, or use auto-return.' };
  }

  const { userId, userName } = await getActor();

  // Return all assets assigned to this employee
  for (const asset of assets) {
    // Use returnAsset function to properly handle the return
    await returnAsset(asset._id);
  }

  // Update employee status to Inactive
  emp.status = 'Inactive';
  emp.resignedAt = new Date();
  emp.isDeleted = true;
  await emp.save();

  await writeLog({ userId, userName, action: 'offboard', description: `Inactivated employee ${emp.employeeName} (returned ${assets.length} asset${assets.length > 1 ? 's' : ''})`, relatedModel: 'Employee', relatedId: employeeId });

  revalidatePath('/employees');
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function reactivateEmployee(employeeId: string): Promise<ActionResult> {
  await connectDB();
  const emp = await Employee.findById(employeeId);
  if (!emp) return { success: false, error: 'Employee not found' };
  
  emp.status = 'Active';
  emp.isDeleted = false;
  emp.resignedAt = undefined;
  await emp.save();
  
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'reactivate', description: `Reactivated employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: employeeId });
  revalidatePath('/employees');
  return { success: true, data: undefined };
}
