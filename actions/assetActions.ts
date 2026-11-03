'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Asset } from '@/models/Asset';
import { Employee } from '@/models/Employee';
import { Contract } from '@/models/Contract';
import { ActivityLog } from '@/models/ActivityLog';
import { CreateAssetSchema, AssignAssetSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import { getContractLifecycleStatus } from '@/lib/contracts';
import { Types } from 'mongoose';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

export async function createAsset(formData: unknown): Promise<ActionResult<string>> {
  const parsed = CreateAssetSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const { isPendingDelivery, ...data } = parsed.data;
  const isPending = isPendingDelivery === 'on' || isPendingDelivery === 'true';
  const assetData = {
    ...data,
    status: isPending ? 'Ordered' : 'In Stock',
    acquisitionDate: isPending ? undefined : data.acquisitionDate,
  };

  try {
    const asset = await Asset.create(assetData);
    const { userId, userName } = await getActor();
    const actionName = isPending ? 'PRE_DELIVERY_INTAKE' : 'create';
    await writeLog({ userId, userName, action: actionName as any, description: `Created asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: asset._id.toString() });
    revalidatePath('/assets');
    return { success: true, data: asset._id.toString() };
  } catch (err: any) {
    if (err.code === 11000 && err.keyPattern?.assetCode) {
      return { success: false, error: `Asset code "${assetData.assetCode}" already exists. Please use a different code.` };
    }
    throw err;
  }
}

export async function updateAsset(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = CreateAssetSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  try {
    const { issuedDate, ...data } = parsed.data;

    // The Issued Date lives on the current assignment (not the asset itself).
    // Only update it when the asset is actually assigned, so we never create a
    // partial assignment record.
    const current = await Asset.findById(id).select('currentAssignment').lean();
    if (!current) return { success: false, error: 'Asset not found' };

    const update: Record<string, unknown> = { ...data };
    if (issuedDate && current.currentAssignment) {
      update['currentAssignment.assignedDate'] = issuedDate;
    }

    const asset = await Asset.findByIdAndUpdate(id, update, { new: true });
    if (!asset) return { success: false, error: 'Asset not found' };
    const { userId, userName } = await getActor();
    await writeLog({ userId, userName, action: 'update', description: `Updated asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: id });
    revalidatePath('/assets');
    return { success: true, data: undefined };
  } catch (err: any) {
    if (err.code === 11000 && err.keyPattern?.assetCode) {
      return { success: false, error: `Asset code "${parsed.data.assetCode}" already exists. Please use a different code.` };
    }
    throw err;
  }
}

export async function assignAsset(assetId: string, formData: unknown): Promise<ActionResult> {
  const parsed = AssignAssetSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  const { employeeId, employeeName, assignedAt, notes } = parsed.data;
  const empObjectId = new Types.ObjectId(employeeId);

  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  // Get the current employee's name before closing the assignment
  let currentEmployeeName = '';
  if (asset.currentAssignment) {
    const currentEmp = await Employee.findById(asset.currentAssignment.employeeId).select('employeeName').lean();
    currentEmployeeName = currentEmp?.employeeName ?? 'Unknown Employee';
    
    asset.assignmentHistory.push({
      employeeId: asset.currentAssignment.employeeId,
      employeeName: currentEmployeeName,
      assignedAt: asset.currentAssignment.assignedDate,
      returnedAt: new Date(),
      notes: asset.currentAssignment.notes,
    });
  }

  asset.currentAssignment = { employeeId: empObjectId, assignedDate: assignedAt, notes };
  asset.assignmentHistory.push({ employeeId: empObjectId, employeeName, assignedAt, notes });
  asset.status = 'In Use';
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'assign', description: `Assigned ${asset.assetCode} to ${employeeName}`, relatedModel: 'Asset', relatedId: assetId, assetCode: asset.assetCode, toEmployee: employeeName });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function returnAsset(assetId: string, returnedDate: Date = new Date()): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };
  if (!asset.currentAssignment) return { success: false, error: 'Asset is not assigned' };

  // Capture the current employee's name BEFORE clearing the assignment
  let currentEmployeeName = 'Unknown';
  if (asset.currentAssignment) {
    const currentEmp = await Employee.findById(asset.currentAssignment.employeeId).select('employeeName').lean();
    currentEmployeeName = currentEmp?.employeeName ?? 'Unknown Employee';
  }

  const last = asset.assignmentHistory.at(-1);
  if (last && !last.returnedAt) last.returnedAt = returnedDate;
  asset.currentAssignment = undefined;
  asset.status = 'In Stock';
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'return', description: `Returned asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: assetId, assetCode: asset.assetCode, fromEmployee: currentEmployeeName });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(id);
  if (!asset) return { success: false, error: 'Asset not found' };

  // Contracts must be deleted before the device they belong to.
  const contract = await Contract.findOne({
    assetId: id,
    isDeleted: { $ne: true },
  })
    .select('_id')
    .lean();
  if (contract) {
    return {
      success: false,
      error: 'Cannot delete this asset: delete its contract first.',
    };
  }

  await Asset.findByIdAndDelete(id);
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'delete', description: `Deleted asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: id });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}
export async function clearAssetLog(assetId: string): Promise<ActionResult<{ deleted: number }>> {
  await connectDB();

  const asset = await Asset.findById(assetId).select('assetCode status').lean();
  if (!asset) return { success: false, error: 'Asset not found' };
  if (asset.status !== 'In Stock') {
    return {
      success: false,
      error: 'Asset log can only be cleared while the asset is In Stock.',
    };
  }

  // Keep the creation entries; clear everything else recorded against the asset.
  const result = await ActivityLog.deleteMany({
    relatedModel: 'Asset',
    relatedId: assetId,
    action: { $nin: ['create', 'PRE_DELIVERY_INTAKE'] },
  });

  const { userId, userName } = await getActor();
  await writeLog({
    userId,
    userName,
    action: 'delete',
    description: `Cleared asset log for ${asset.assetCode}`,
    relatedModel: 'Asset',
    relatedId: assetId,
    assetCode: asset.assetCode,
  });

  revalidatePath('/assets');
  return { success: true, data: { deleted: result.deletedCount ?? 0 } };
}

export async function confirmDelivery(assetId: string, acquisitionDate: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  const deliveryDate = new Date();
  asset.status = 'In Stock';
  asset.acquisitionDate = acquisitionDate ? new Date(acquisitionDate) : deliveryDate;
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'DELIVERY_CONFIRMED' as any, description: `Delivery confirmed for asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: assetId });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function transferAsset(assetId: string, newEmployeeId: string, notes?: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  const empObjId = new Types.ObjectId(newEmployeeId);
  const employee = await Employee.findById(newEmployeeId).select('employeeName').lean();
  const employeeName = employee?.employeeName ?? 'Unknown Employee';

  // Capture the current employee's name BEFORE updating the assignment
  let currentEmployeeName = 'Unknown';
  if (asset.currentAssignment) {
    const currentEmp = await Employee.findById(asset.currentAssignment.employeeId).select('employeeName').lean();
    currentEmployeeName = currentEmp?.employeeName ?? 'Unknown Employee';
    const last = asset.assignmentHistory.at(-1);
    if (last && !last.returnedAt) last.returnedAt = new Date();
  }

  // create new assignment
  asset.currentAssignment = { employeeId: empObjId, assignedDate: new Date(), notes };
  asset.assignmentHistory.push({ employeeId: empObjId, employeeName: employeeName, assignedAt: new Date(), notes });
  asset.status = 'In Use';
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'ASSET_TRANSFER', description: `Transferred asset ${asset.assetCode} to ${employeeName}`, relatedModel: 'Asset', relatedId: assetId, assetCode: asset.assetCode, fromEmployee: currentEmployeeName, toEmployee: employeeName });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function recommissionAsset(assetId: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  asset.status = 'In Stock';
  asset.isDeleted = false;
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'ASSET_RECOMMISSION', description: `Recommissioned asset ${asset.assetCode} — returned to In Stock`, relatedModel: 'Asset', relatedId: assetId, assetCode: asset.assetCode });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function decommissionAsset(assetId: string, reason: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  // A device covered by an active contract cannot be decommissioned on its own.
  const contracts = await Contract.find({
    assetId,
    isDeleted: { $ne: true },
  })
    .select('issuedDate endedAt')
    .lean();
  const now = new Date();
  const hasActiveContract = contracts.some(
    (c) => !c.endedAt && getContractLifecycleStatus(c.issuedDate, now) === 'Active'
  );
  if (hasActiveContract) {
    return {
      success: false,
      error: 'This device is on an active contract and cannot be decommissioned.',
    };
  }

  // close current assignment if any
  if (asset.currentAssignment) {
    const employee = await Employee.findById(asset.currentAssignment.employeeId)
      .select('employeeName')
      .lean();
    asset.assignmentHistory.push({
      employeeId: asset.currentAssignment.employeeId,
      employeeName: employee?.employeeName ?? 'Unknown Employee',
      assignedAt: asset.currentAssignment.assignedDate,
      returnedAt: new Date(),
      notes: asset.currentAssignment.notes,
    });
    asset.currentAssignment = undefined;
  }

  asset.status = 'Decommissioned';
  asset.isDeleted = true;
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'ASSET_DECOMMISSION', description: `Decommissioned asset ${asset.assetCode}: ${reason}`, relatedModel: 'Asset', relatedId: assetId, assetCode: asset.assetCode, reason });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}
