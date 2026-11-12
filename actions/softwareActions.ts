'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Software } from '@/models/Software';
import { Employee } from '@/models/Employee';
import { CreateSoftwareSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

export async function createSoftware(formData: unknown): Promise<ActionResult<string>> {
  const parsed = CreateSoftwareSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const sw = await Software.create(parsed.data);
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'create', description: `Created software ${sw.softwareName}`, relatedModel: 'Software', relatedId: sw._id.toString() });
  revalidatePath('/software');
  return { success: true, data: sw._id.toString() };
}

export async function updateSoftware(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = CreateSoftwareSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  const { softwareName, category, status, ...optional } = parsed.data;

  // Fields cleared in the form must be removed from an existing document too.
  const $set: Record<string, unknown> = { softwareName, category, status };
  const $unset: Record<string, ''> = {};
  for (const [key, value] of Object.entries(optional)) {
    if (value === undefined) $unset[key] = '';
    else $set[key] = value;
  }

  await connectDB();
  const sw = await Software.findByIdAndUpdate(
    id,
    { $set, ...(Object.keys($unset).length > 0 ? { $unset } : {}) },
    { new: true }
  );
  if (!sw) return { success: false, error: 'Software not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Updated software ${sw.softwareName}`, relatedModel: 'Software', relatedId: id });
  revalidatePath('/software');
  return { success: true, data: undefined };
}

export async function deleteSoftware(id: string): Promise<ActionResult> {
  await connectDB();
  const sw = await Software.findByIdAndDelete(id);
  if (sw) {
    await Employee.updateMany({ softwareIds: id }, { $pull: { softwareIds: id } });
    const { userId, userName } = await getActor();
    await writeLog({ userId, userName, action: 'delete', description: `Deleted software ${sw.softwareName}`, relatedModel: 'Software', relatedId: id });
  }
  revalidatePath('/software');
  return { success: true, data: undefined };
}
