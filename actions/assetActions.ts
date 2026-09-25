'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Asset } from '@/models/Asset';
import { CreateAssetSchema, AssignAssetSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
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
    status: isPending ? 'Pending Delivery' : 'In Stock',
    acquisitionDate: isPending ? undefined : data.acquisitionDate,
  };

  const asset = await Asset.create(assetData);
  const { userId, userName } = await getActor();
  const actionName = isPending ? 'PRE_DELIVERY_INTAKE' : 'create';
  await writeLog({ userId, userName, action: actionName as any, description: `Created asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: asset._id.toString() });
  revalidatePath('/assets');
  return { success: true, data: asset._id.toString() };
}

export async function updateAsset(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = CreateAssetSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const asset = await Asset.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!asset) return { success: false, error: 'Asset not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Updated asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: id });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function assignAsset(assetId: string, formData: unknown): Promise<ActionResult> {
  const parsed = AssignAssetSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  const { employeeId, employeeName, assignedAt, notes } = parsed.data;
  const empObjectId = new Types.ObjectId(employeeId);

  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  if (asset.currentAssignment) {
    asset.assignmentHistory.push({
      employeeId: asset.currentAssignment.employeeId,
      employeeName: '',
      assignedAt: asset.currentAssignment.assignedDate,
      returnedAt: new Date(),
      notes: asset.currentAssignment.notes,
    });
  }

  asset.currentAssignment = { employeeId: empObjectId, assignedDate: assignedAt, notes };
  asset.assignmentHistory.push({ employeeId: empObjectId, employeeName, assignedAt, notes });
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'assign', description: `Assigned ${asset.assetCode} to ${employeeName}`, relatedModel: 'Asset', relatedId: assetId });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function returnAsset(assetId: string, returnedDate: Date = new Date()): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };
  if (!asset.currentAssignment) return { success: false, error: 'Asset is not assigned' };

  const last = asset.assignmentHistory.at(-1);
  if (last && !last.returnedAt) last.returnedAt = returnedDate;
  asset.currentAssignment = undefined;
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'return', description: `Returned asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: assetId });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findByIdAndDelete(id);
  if (!asset) return { success: false, error: 'Asset not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'delete', description: `Deleted asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: id });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}
export async function confirmDelivery(assetId: string, acquisitionDate: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  asset.status = 'In Stock';
  asset.deliveredAt = new Date();
  if (acquisitionDate) asset.acquisitionDate = new Date(acquisitionDate);
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

  // close current assignment if exists
  if (asset.currentAssignment) {
    asset.assignmentHistory.push({
      employeeId: asset.currentAssignment.employeeId,
      employeeName: '',
      assignedAt: asset.currentAssignment.assignedDate,
      returnedAt: new Date(),
      notes: asset.currentAssignment.notes,
    });
  }

  const empObjId = new Types.ObjectId(newEmployeeId);
  // create new assignment
  asset.currentAssignment = { employeeId: empObjId, assignedDate: new Date(), notes };
  asset.assignmentHistory.push({ employeeId: empObjId, employeeName: '', assignedAt: new Date(), notes });
  asset.status = 'In Use';
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'ASSET_TRANSFER' as any, description: `Transferred asset ${asset.assetCode} to employee ${newEmployeeId}`, relatedModel: 'Asset', relatedId: assetId });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function markForRepair(assetId: string, issueDescription: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  // close current assignment if any
  if (asset.currentAssignment) {
    asset.assignmentHistory.push({
      employeeId: asset.currentAssignment.employeeId,
      employeeName: '',
      assignedAt: asset.currentAssignment.assignedDate,
      returnedAt: new Date(),
      notes: asset.currentAssignment.notes,
    });
    asset.currentAssignment = undefined;
  }

  asset.status = 'Under Repair';
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'ASSET_MAINTENANCE_START' as any, description: `Asset ${asset.assetCode} marked for repair: ${issueDescription}`, relatedModel: 'Asset', relatedId: assetId });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function completeRepair(assetId: string, resolutionNotes?: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  asset.status = 'In Stock';
  await asset.save();

  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'ASSET_MAINTENANCE_END' as any, description: `Repair completed for asset ${asset.assetCode}. ${resolutionNotes ?? ''}`, relatedModel: 'Asset', relatedId: assetId });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}

export async function decommissionAsset(assetId: string, reason: string): Promise<ActionResult> {
  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  // close current assignment if any
  if (asset.currentAssignment) {
    asset.assignmentHistory.push({
      employeeId: asset.currentAssignment.employeeId,
      employeeName: '',
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
  await writeLog({ userId, userName, action: 'ASSET_DECOMMISSION' as any, description: `Decommissioned asset ${asset.assetCode}: ${reason}`, relatedModel: 'Asset', relatedId: assetId });
  revalidatePath('/assets');
  return { success: true, data: undefined };
}
