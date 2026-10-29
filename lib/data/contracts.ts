import { connectDB } from '@/lib/db/mongoose';
import { Contract, IContract } from '@/models/Contract';
import { Asset } from '@/models/Asset';
import { Employee } from '@/models/Employee';
import { computeContractMetrics } from '@/lib/contracts';
import type { ContractStatus } from '@/lib/contracts';
import type { Types } from 'mongoose';

export type ContractRow = {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeStatus: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  acquisitionCost: number;
  acquisitionDate: string;
  depreciationMethod?: string;
  issuedDate: string;
  finishDate: string;
  numberOfMonths: number;
  perCutoff: number;
  perMonth: number;
  totalContribution: number;
  totalPaid: number;
  remaining: number;
  status: ContractStatus;
};

export type EligibleContractOption = {
  employeeId: string;
  employeeName: string;
  employeeStatus: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  acquisitionCost: number;
  issuedDate: string;
};

type PopulatedEmployee = {
  _id: Types.ObjectId;
  employeeName?: string;
  status?: string;
};

type PopulatedAsset = {
  _id: Types.ObjectId;
  acquisitionCost?: number;
  acquisitionDate?: Date;
  depreciationMethod?: string;
};

type LeanContract = Omit<IContract, '_id' | 'employeeId' | 'assetId'> & {
  _id: Types.ObjectId;
  employeeId: PopulatedEmployee | Types.ObjectId | null;
  assetId: PopulatedAsset | Types.ObjectId;
};

type LeanEligibleAsset = {
  _id: Types.ObjectId;
  assetName: string;
  assetCode: string;
  acquisitionCost: number;
  currentAssignment?: {
    employeeId: PopulatedEmployee | Types.ObjectId | null;
    assignedDate?: Date;
  };
};

function isPopulated(value: unknown): value is PopulatedEmployee {
  return !!value && typeof value === 'object' && '_id' in (value as Record<string, unknown>);
}

function isPopulatedAsset(value: unknown): value is PopulatedAsset {
  return !!value && typeof value === 'object' && '_id' in (value as Record<string, unknown>);
}

export async function getContracts({
  page = 0,
  pageSize = 50,
  search = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ rows: ContractRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    isDeleted: { $ne: true },
    employeeId: { $exists: true },
    issuedDate: { $exists: true },
  };

  if (search) {
    query.$or = [
      { employeeName: { $regex: search, $options: 'i' } },
      { assetName: { $regex: search, $options: 'i' } },
      { assetCode: { $regex: search, $options: 'i' } },
    ];
  }

  const [docs, total] = await Promise.all([
    Contract.find(query)
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .populate({ path: 'employeeId', select: 'employeeName status', model: Employee })
      .populate({ path: 'assetId', select: 'acquisitionCost acquisitionDate depreciationMethod', model: Asset })
      .lean() as unknown as Promise<LeanContract[]>,
    Contract.countDocuments(query),
  ]);

  const now = new Date();

  return {
    rows: docs.map((c) => {
      const employee = isPopulated(c.employeeId) ? c.employeeId : null;
      const asset = isPopulatedAsset(c.assetId) ? c.assetId : null;
      const metrics = computeContractMetrics({
        issuedDate: c.issuedDate,
        numberOfMonths: c.numberOfMonths,
        perCutoff: c.perCutoff,
        totalContribution: c.totalContribution,
        referenceDate: now,
      });

      return {
        _id: c._id.toString(),
        employeeId: employee?._id?.toString() ?? '',
        employeeName: employee?.employeeName || c.employeeName,
        employeeStatus: employee?.status || 'Unknown',
        assetId: asset ? asset._id.toString() : c.assetId.toString(),
        assetName: c.assetName,
        assetCode: c.assetCode,
        acquisitionCost: asset?.acquisitionCost ?? 0,
        acquisitionDate: asset?.acquisitionDate ? new Date(asset.acquisitionDate).toISOString() : '',
        depreciationMethod: asset?.depreciationMethod,
        issuedDate: new Date(c.issuedDate).toISOString(),
        finishDate: metrics.finishDate.toISOString(),
        numberOfMonths: c.numberOfMonths,
        perCutoff: c.perCutoff,
        perMonth: metrics.perMonth,
        totalContribution: c.totalContribution,
        totalPaid: metrics.totalPaid,
        remaining: metrics.remaining,
        status: metrics.status,
      };
    }),
    total,
  };
}

/**
 * Employees who currently hold a laptop and do not already have a contract.
 * One option per employee (their first eligible laptop).
 */
export async function getEligibleLaptopEmployees(): Promise<EligibleContractOption[]> {
  await connectDB();

  const [assets, contracts] = await Promise.all([
    Asset.find({
      assetType: 'laptop',
      status: 'In Use',
      'currentAssignment.employeeId': { $exists: true },
    })
      .populate({ path: 'currentAssignment.employeeId', select: 'employeeName status', model: Employee })
      .lean() as unknown as Promise<LeanEligibleAsset[]>,
    Contract.find({ isDeleted: { $ne: true }, employeeId: { $exists: true } })
      .select('employeeId')
      .lean(),
  ]);

  // Anyone who already has a contract is no longer offered in Add Contract.
  const blockedEmployees = new Set<string>();
  for (const c of contracts) {
    if (c.employeeId) blockedEmployees.add(c.employeeId.toString());
  }

  const seenEmployees = new Set<string>();
  const options: EligibleContractOption[] = [];

  for (const asset of assets) {
    const employee = isPopulated(asset.currentAssignment?.employeeId)
      ? asset.currentAssignment.employeeId
      : null;

    if (!employee?._id) continue;

    const employeeId = employee._id.toString();
    const assetId = asset._id.toString();

    if (blockedEmployees.has(employeeId)) continue;
    if (seenEmployees.has(employeeId)) continue;

    seenEmployees.add(employeeId);
    options.push({
      employeeId,
      employeeName: employee.employeeName || 'Unknown Employee',
      employeeStatus: employee.status || 'Unknown',
      assetId,
      assetName: asset.assetName,
      assetCode: asset.assetCode,
      acquisitionCost: asset.acquisitionCost ?? 0,
      issuedDate: asset.currentAssignment?.assignedDate
        ? new Date(asset.currentAssignment.assignedDate).toISOString()
        : new Date().toISOString(),
    });
  }

  options.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return options;
}
