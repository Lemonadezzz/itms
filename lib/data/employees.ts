import { connectDB } from '@/lib/db/mongoose';
import { Employee } from '@/models/Employee';
import { Asset } from '@/models/Asset';

export type EmployeeRow = {
  _id: string;
  employeeName: string;
  department: string;
  userType: string;
  location: string;
  status: string;
  hiredAt?: string;
  resignedAt?: string;
  isDeleted: boolean;
  assignedAssetCount: number;
};

export async function getEmployees({
  page = 0,
  pageSize = 50,
  search = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ rows: EmployeeRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = search
    ? { $or: [
        { employeeName: { $regex: search, $options: 'i' } },
        { department:   { $regex: search, $options: 'i' } },
      ]}
    : {};

  const [docs, total] = await Promise.all([
    Employee.find(query).sort({ employeeName: 1 }).skip(page * pageSize).limit(pageSize).lean(),
    Employee.countDocuments(query),
  ]);

  // Fetch assigned asset counts for all returned employees in one query
  const employeeIds = docs.map((d) => d._id);
  const assetCounts = await Asset.aggregate([
    {
      $match: {
        'currentAssignment.employeeId': { $in: employeeIds },
        status: 'In Use',
      },
    },
    {
      $group: {
        _id: '$currentAssignment.employeeId',
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map<string, number>();
  assetCounts.forEach((a) => {
    countMap.set(a._id.toString(), a.count);
  });

  return {
    rows: docs.map((e) => ({
      _id: e._id.toString(),
      employeeName: e.employeeName,
      department: e.department,
      userType: e.userType,
      location: e.location,
      status: e.status,
      hiredAt: (e.hiredAt || (e as any).hireDate)?.toISOString(),
      resignedAt: e.resignedAt?.toISOString(),
      isDeleted: e.isDeleted,
      assignedAssetCount: countMap.get(e._id.toString()) ?? 0,
    })),
    total,
  };
}

export async function getEmployeeOptions(): Promise<{ _id: string; employeeName: string }[]> {
  await connectDB();
  // Only return active employees for assignment
  const docs = await Employee.find({ status: 'Active' }, { employeeName: 1 }).sort({ employeeName: 1 }).lean();
  return docs.map((e) => ({ _id: e._id.toString(), employeeName: e.employeeName }));
}
