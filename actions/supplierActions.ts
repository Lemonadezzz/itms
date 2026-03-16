'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Supplier } from '@/models/Supplier';
import { CreateSupplierSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

function parseCategories(raw?: string): string[] {
  return raw ? raw.split(',').map((c) => c.trim()).filter(Boolean) : [];
}

export async function createSupplier(formData: unknown): Promise<ActionResult<string>> {
  const parsed = CreateSupplierSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const { categories: rawCats, ...rest } = parsed.data;
  const supplier = await Supplier.create({ ...rest, categories: parseCategories(rawCats) });
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'create', description: `Created supplier ${supplier.supplierName}`, relatedModel: 'Supplier', relatedId: supplier._id.toString() });
  revalidatePath('/suppliers');
  return { success: true, data: supplier._id.toString() };
}

export async function updateSupplier(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = CreateSupplierSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const { categories: rawCats, ...rest } = parsed.data;
  const supplier = await Supplier.findByIdAndUpdate(id, { ...rest, categories: parseCategories(rawCats) }, { new: true });
  if (!supplier) return { success: false, error: 'Supplier not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Updated supplier ${supplier.supplierName}`, relatedModel: 'Supplier', relatedId: id });
  revalidatePath('/suppliers');
  return { success: true, data: undefined };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  await connectDB();
  const supplier = await Supplier.findByIdAndDelete(id);
  const { userId, userName } = await getActor();
  if (supplier) await writeLog({ userId, userName, action: 'delete', description: `Deleted supplier ${supplier.supplierName}`, relatedModel: 'Supplier', relatedId: id });
  revalidatePath('/suppliers');
  return { success: true, data: undefined };
}
