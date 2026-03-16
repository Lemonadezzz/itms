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
    assignedDate: Date;
    returnedDate?: Date;
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
    const ageInMonths = Math.floor(
      (now - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    const emp = a.currentAssignment?.employeeId as { employeeName?: string } | null | undefined;
    return {
      _id: a._id.toString(),
      assetCode: a.assetCode,
      assetName: a.assetName,
      assetType: a.assetType,
      location: a.location,
      acquisitionDate: new Date(a.acquisitionDate).toISOString(),
      acquisitionCost: a.acquisitionCost,
      ageInMonths,
      assignedTo: emp?.employeeName,
      isAssigned: !!a.currentAssignment,
      depreciationMethod: a.depreciationMethod,
      assignmentHistory: (a.assignmentHistory ?? []).map((h): AssetAssignmentHistory => ({
        employeeName: h.employeeName,
        assignedDate: new Date(h.assignedDate).toISOString(),
        returnedDate: h.returnedDate ? new Date(h.returnedDate).toISOString() : undefined,
        notes: h.notes,
      })),
    };
  });

  return { rows, total };
}
