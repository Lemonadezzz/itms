'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Employee } from '@/models/Employee';
import { Department } from '@/models/Department';
import { Asset } from '@/models/Asset';
import { Contract } from '@/models/Contract';
import { Software } from '@/models/Software';
import { getSoftwareOptions } from '@/lib/data/software';
import { CreateEmployeeSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import { guardAction } from '@/lib/access';
import { returnAsset } from '@/actions/assetActions';
import { getContractLifecycleStatus } from '@/lib/contracts';
import { getContractsByEmployee } from '@/lib/data/contracts';
import type { EmployeeContractSummary } from '@/lib/data/contracts';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

export async function createEmployee(formData: unknown): Promise<ActionResult<string>> {
  const guard = await guardAction('employees', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = CreateEmployeeSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const dept = await Department.findById(parsed.data.departmentId).select('departmentName').lean();
  if (!dept) return { success: false, error: 'Selected department no longer exists.' };

  let emp;
  try {
    emp = await Employee.create({ ...parsed.data, department: dept.departmentName });
  } catch (err: any) {
    if (err?.code === 11000) return { success: false, error: 'An employee with this email already exists.' };
    throw err;
  }
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'create', description: `Created employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: emp._id.toString() });
  revalidatePath('/end-user-management');
  revalidatePath('/employees');
  return { success: true, data: emp._id.toString() };
}

export async function updateEmployee(id: string, formData: unknown): Promise<ActionResult> {
  const guard = await guardAction('employees', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = CreateEmployeeSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const dept = await Department.findById(parsed.data.departmentId).select('departmentName').lean();
  if (!dept) return { success: false, error: 'Selected department no longer exists.' };

  let emp;
  try {
    emp = await Employee.findByIdAndUpdate(
      id,
      { ...parsed.data, department: dept.departmentName },
      { new: true }
    );
  } catch (err: any) {
    if (err?.code === 11000) return { success: false, error: 'An employee with this email already exists.' };
    throw err;
  }
  if (!emp) return { success: false, error: 'Employee not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Updated employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: id });
  revalidatePath('/end-user-management');
  revalidatePath('/employees');
  return { success: true, data: undefined };
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  const guard = await guardAction('employees', 'delete');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const emp = await Employee.findById(id);
  if (!emp) return { success: false, error: 'Employee not found' };

  // Deletion order is contract → asset → employee.
  const contractCount = await Contract.countDocuments({ employeeId: id });
  if (contractCount > 0) {
    return {
      success: false,
      error: 'Cannot delete this employee: delete their contract first.',
    };
  }

  const assignedAssetCount = await Asset.countDocuments({
    'currentAssignment.employeeId': id,
  });
  if (assignedAssetCount > 0) {
    return {
      success: false,
      error: 'Cannot delete this employee: delete their assigned asset first.',
    };
  }

  await Employee.findByIdAndDelete(id);
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'delete', description: `Deleted employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: id });
  revalidatePath('/end-user-management');
  revalidatePath('/employees');
  return { success: true, data: undefined };
}

export async function checkEmployeeAssets(employeeId: string): Promise<ActionResult<{ assetCount: number; assets: Array<{ _id: string; assetCode: string; assetName: string; status: string }> }>> {
  await connectDB();
  const assets = await Asset.find(
    {
      'currentAssignment.employeeId': employeeId,
      status: 'In Use',
    },
    { _id: 1, assetCode: 1, assetName: 1, status: 1 }
  ).lean();
  return { success: true, data: { assetCount: assets.length, assets: assets.map((a) => ({ _id: a._id.toString(), assetCode: a.assetCode, assetName: a.assetName, status: a.status })) } };
}

export async function checkEmployeeContracts(
  employeeId: string
): Promise<ActionResult<EmployeeContractSummary[]>> {
  const contracts = await getContractsByEmployee(employeeId);
  return { success: true, data: contracts };
}

export type EmployeeSoftwareItem = {
  _id: string;
  softwareName: string;
  category: string;
  status: string;
};

export async function getEmployeeSoftware(
  employeeId: string
): Promise<ActionResult<{ assigned: EmployeeSoftwareItem[]; options: EmployeeSoftwareItem[] }>> {
  await connectDB();
  const [emp, options] = await Promise.all([
    Employee.findById(employeeId, { softwareIds: 1 }).lean(),
    getSoftwareOptions(),
  ]);
  if (!emp) return { success: false, error: 'Employee not found' };

  const assignedIds = new Set((emp.softwareIds ?? []).map(String));
  return {
    success: true,
    data: { assigned: options.filter((o) => assignedIds.has(o._id)), options },
  };
}

export async function assignSoftwareToEmployee(
  employeeId: string,
  softwareId: string
): Promise<ActionResult> {
  const guard = await guardAction('employees', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const [emp, sw] = await Promise.all([
    Employee.findById(employeeId),
    Software.findById(softwareId, { softwareName: 1 }),
  ]);
  if (!emp) return { success: false, error: 'Employee not found' };
  if (!sw) return { success: false, error: 'Software not found' };

  await Employee.updateOne({ _id: employeeId }, { $addToSet: { softwareIds: sw._id } });
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'assign', description: `Assigned software ${sw.softwareName} to ${emp.employeeName}`, relatedModel: 'Employee', relatedId: employeeId });
  revalidatePath('/end-user-management');
  revalidatePath('/employees');
  return { success: true, data: undefined };
}

export async function removeSoftwareFromEmployee(
  employeeId: string,
  softwareId: string
): Promise<ActionResult> {
  const guard = await guardAction('employees', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const [emp, sw] = await Promise.all([
    Employee.findById(employeeId),
    Software.findById(softwareId, { softwareName: 1 }),
  ]);
  if (!emp) return { success: false, error: 'Employee not found' };

  await Employee.updateOne({ _id: employeeId }, { $pull: { softwareIds: softwareId } });
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Removed software ${sw?.softwareName ?? softwareId} from ${emp.employeeName}`, relatedModel: 'Employee', relatedId: employeeId });
  revalidatePath('/end-user-management');
  revalidatePath('/employees');
  return { success: true, data: undefined };
}

export async function offboardEmployee(employeeId: string, autoReturn?: boolean): Promise<ActionResult> {
  const guard = await guardAction('employees', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const emp = await Employee.findById(employeeId);
  if (!emp) return { success: false, error: 'Employee not found' };

  // An employee with a running contract cannot be inactivated until it ends.
  const contracts = await Contract.find({ employeeId })
    .select('issuedDate endedAt')
    .lean();
  const now = new Date();
  const hasActiveContract = contracts.some(
    (c) => !c.endedAt && getContractLifecycleStatus(c.issuedDate, now) === 'Active'
  );
  if (hasActiveContract) {
    return {
      success: false,
      error: 'Employee has an active contract. End the contract first.',
    };
  }

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
  await emp.save();

  await writeLog({ userId, userName, action: 'offboard', description: `Inactivated employee ${emp.employeeName} (returned ${assets.length} asset${assets.length > 1 ? 's' : ''})`, relatedModel: 'Employee', relatedId: employeeId });

  revalidatePath('/end-user-management');
  revalidatePath('/employees');
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function reactivateEmployee(employeeId: string): Promise<ActionResult> {
  const guard = await guardAction('employees', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const emp = await Employee.findById(employeeId);
  if (!emp) return { success: false, error: 'Employee not found' };
  
  emp.status = 'Active';
  emp.resignedAt = undefined;
  await emp.save();
  
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'reactivate', description: `Reactivated employee ${emp.employeeName}`, relatedModel: 'Employee', relatedId: employeeId });
  revalidatePath('/end-user-management');
  revalidatePath('/employees');
  return { success: true, data: undefined };
}
