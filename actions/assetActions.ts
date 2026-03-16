'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Asset } from '@/models/Asset';
import { CreateAssetSchema, AssignAssetSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
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
  const asset = await Asset.create(parsed.data);
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'create', description: `Created asset ${asset.assetCode}`, relatedModel: 'Asset', relatedId: asset._id.toString() });
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

  const { employeeId, employeeName, assignedDate, notes } = parsed.data;

  await connectDB();
  const asset = await Asset.findById(assetId);
  if (!asset) return { success: false, error: 'Asset not found' };

  if (asset.currentAssignment) {
    asset.assignmentHistory.push({
      employeeId: asset.currentAssignment.employeeId,
      employeeName: '',
      assignedDate: asset.currentAssignment.assignedDate,
      returnedDate: new Date(),
      notes: asset.currentAssignment.notes,
    });
  }

  asset.currentAssignment = { employeeId, assignedDate, notes };
  asset.assignmentHistory.push({ employeeId, employeeName, assignedDate, notes });
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
  if (last && !last.returnedDate) last.returnedDate = returnedDate;
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
