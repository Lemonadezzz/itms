'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Contract } from '@/models/Contract';
import { Asset } from '@/models/Asset';
import { Employee } from '@/models/Employee';
import { CreateContractSchema, UpdateContractSchema } from '@/lib/validations';
import { computePerCutoff, computeTotalContribution } from '@/lib/contracts';
import { writeLog } from '@/lib/activityLog';
import { getEligibleLaptopEmployees } from '@/lib/data/contracts';
import type { EligibleContractOption } from '@/lib/data/contracts';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

async function hasContract(employeeId: string): Promise<boolean> {
  return !!(await Contract.exists({ isDeleted: { $ne: true }, employeeId }));
}

export async function createContract(formData: unknown): Promise<ActionResult<string>> {
  const parsed = CreateContractSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();

  const asset = await Asset.findById(parsed.data.assetId).lean();
  if (!asset) return { success: false, error: 'Laptop not found.' };
  if (asset.assetType !== 'laptop') {
    return { success: false, error: 'Contracts can only be created for laptops.' };
  }
  if (asset.status !== 'In Use') {
    return { success: false, error: 'This laptop is not currently issued.' };
  }
  if (asset.currentAssignment?.employeeId?.toString() !== parsed.data.employeeId) {
    return { success: false, error: 'This employee is not the current holder of the laptop.' };
  }

  const employee = await Employee.findById(parsed.data.employeeId).lean();
  if (!employee) return { success: false, error: 'Employee not found.' };

  if (await hasContract(parsed.data.employeeId)) {
    return { success: false, error: 'This employee already has a contract.' };
  }

  // Contribution is derived from the laptop cost: 30%, capped at ₱30,000.
  const totalContribution = computeTotalContribution(asset.acquisitionCost ?? 0);
  const perCutoff = computePerCutoff(totalContribution, parsed.data.numberOfMonths);

  const contract = await Contract.create({
    employeeId:         employee._id,
    employeeName:       employee.employeeName,
    assetId:            asset._id,
    assetName:          asset.assetName,
    assetCode:          asset.assetCode,
    issuedDate:         asset.currentAssignment?.assignedDate ?? new Date(),
    numberOfMonths:     parsed.data.numberOfMonths,
    perCutoff,
    totalContribution,
  });

  const { userId, userName } = await getActor();
  await writeLog({
    userId,
    userName,
    action: 'create',
    description: `Created contract for ${employee.employeeName} — ${asset.assetName} (${asset.assetCode})`,
    relatedModel: 'Contract',
    relatedId: contract._id.toString(),
  });

  revalidatePath('/contracts');
  return { success: true, data: contract._id.toString() };
}

export async function updateContract(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = UpdateContractSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();

  const existing = await Contract.findById(id).lean();
  if (!existing) return { success: false, error: 'Contract not found.' };

  const asset = await Asset.findById(existing.assetId).lean();
  const totalContribution = asset
    ? computeTotalContribution(asset.acquisitionCost ?? 0)
    : existing.totalContribution;
  const perCutoff = computePerCutoff(totalContribution, parsed.data.numberOfMonths);

  const contract = await Contract.findByIdAndUpdate(
    id,
    {
      numberOfMonths: parsed.data.numberOfMonths,
      perCutoff,
      totalContribution,
    },
    { new: true }
  );
  if (!contract) return { success: false, error: 'Contract not found.' };

  const { userId, userName } = await getActor();
  await writeLog({
    userId,
    userName,
    action: 'update',
    description: `Updated contract for ${contract.employeeName} — ${contract.assetName} (${contract.assetCode})`,
    relatedModel: 'Contract',
    relatedId: id,
  });

  revalidatePath('/contracts');
  return { success: true, data: undefined };
}

export async function fetchEligibleLaptopEmployees(): Promise<ActionResult<EligibleContractOption[]>> {
  await connectDB();
  const options = await getEligibleLaptopEmployees();
  return { success: true, data: options };
}
