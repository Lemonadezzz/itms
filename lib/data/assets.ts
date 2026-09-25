import { connectDB } from '@/lib/db/mongoose';
import { Asset, IAsset } from '@/models/Asset';
import type { AssetRow, AssetAssignmentHistory } from '@/types';
import type { Types } from 'mongoose';

export type AssetFilters = {
  search?: string;
  assetType?: string;
  isAssigned?: string;
  location?: string;
  assignedToId?: string;
};

type LeanAsset = Omit<IAsset, '_id' | 'currentAssignment'> & {
  _id: Types.ObjectId;
  currentAssignment?: {
    employeeId: { employeeName?: string } | Types.ObjectId;
    assignedDate: Date;
    notes?: string;
  };
  assignmentHistory: {
    employeeName: string;
    assignedAt: Date;
    returnedAt?: Date;
    notes?: string;
  }[];
};

export async function getAssets({
  page = 0,
  pageSize = 50,
  sortField = 'createdAt',
  sortDir = 'desc',
  filters = {},
}: {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDir?: string;
  filters?: AssetFilters;
}): Promise<{ rows: AssetRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (filters.search) {
    query.$or = [
      { assetName: { $regex: filters.search, $options: 'i' } },
      { assetCode: { $regex: filters.search, $options: 'i' } },
    ];
  }
  if (filters.assetType)  query.assetType = filters.assetType;
  if (filters.isAssigned === 'true')  query.currentAssignment = { $exists: true, $ne: null };
  if (filters.isAssigned === 'false') query.currentAssignment = { $exists: false };
  if (filters.location)   query.location = { $regex: filters.location, $options: 'i' };
  if (filters.assignedToId) query['currentAssignment.employeeId'] = filters.assignedToId;

  const sort: Record<string, 1 | -1> = { [sortField]: sortDir === 'asc' ? 1 : -1 };

  const [docs, total] = await Promise.all([
    Asset.find(query)
      .sort(sort)
      .skip(page * pageSize)
      .limit(pageSize)
      .populate('currentAssignment.employeeId', 'employeeName')
      .lean() as unknown as Promise<LeanAsset[]>,
    Asset.countDocuments(query),
  ]);

  const now = Date.now();

  const rows: AssetRow[] = docs.map((a) => {
    const ageInMonths = a.acquisitionDate ? Math.floor(
      (now - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    ) : 0;
    const emp = a.currentAssignment?.employeeId as { employeeName?: string } | null | undefined;
    return {
      _id: a._id.toString(),
      assetCode: a.assetCode,
      assetName: a.assetName,
      assetType: a.assetType,
      location: a.location,
      acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate).toISOString() : '',
      acquisitionCost: a.acquisitionCost,
      ageInMonths,
      assignedTo: emp?.employeeName,
      isAssigned: !!a.currentAssignment,
      status: a.status,
      depreciationMethod: a.depreciationMethod,
      assignmentHistory: (a.assignmentHistory ?? []).map((h): AssetAssignmentHistory => ({
        employeeName: h.employeeName,
        assignedAt: new Date(h.assignedAt || (h as any).assignedDate).toISOString(),
        returnedAt: (h.returnedAt || (h as any).returnedDate) ? new Date(h.returnedAt || (h as any).returnedDate).toISOString() : undefined,
        notes: h.notes,
      })),
    };
  });

  return { rows, total };
}

export async function getAssetById(id: string): Promise<AssetRow | null> {
  await connectDB();
  let doc: LeanAsset | null;
  try {
    doc = await Asset.findById(id)
      .populate('currentAssignment.employeeId', 'employeeName')
      .lean() as unknown as LeanAsset | null;
  } catch {
    return null;
  }
  if (!doc) return null;

  const now = Date.now();
  const ageInMonths = doc.acquisitionDate ? Math.floor(
    (now - new Date(doc.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  ) : 0;
  const emp = doc.currentAssignment?.employeeId as { employeeName?: string } | null | undefined;

  return {
    _id: doc._id.toString(),
    assetCode: doc.assetCode,
    assetName: doc.assetName,
    assetType: doc.assetType,
    location: doc.location,
    acquisitionDate: doc.acquisitionDate ? new Date(doc.acquisitionDate).toISOString() : '',
    acquisitionCost: doc.acquisitionCost,
    ageInMonths,
    assignedTo: emp?.employeeName,
    isAssigned: !!doc.currentAssignment,
    status: doc.status,
    depreciationMethod: doc.depreciationMethod,
    assignmentHistory: (doc.assignmentHistory ?? []).map((h): AssetAssignmentHistory => ({
      employeeName: h.employeeName,
      assignedAt: new Date(h.assignedAt || (h as any).assignedDate).toISOString(),
      returnedAt: (h.returnedAt || (h as any).returnedDate)
        ? new Date(h.returnedAt || (h as any).returnedDate).toISOString()
        : undefined,
      notes: h.notes,
    })),
  };
}

