import { connectDB } from '@/lib/db/mongoose';
import { Employee } from '@/models/Employee';
import { Asset } from '@/models/Asset';
import { Contract } from '@/models/Contract';
import { formatTenureShort, getContractLifecycleStatus, monthsElapsed } from '@/lib/contracts';
import type { EmployeeContractBadge } from '@/lib/employeeBadges';

export type EmployeeRow = {
  _id: string;
  employeeName: string;
  email: string;
  department: string;
  userType: string;
  status: string;
  hiredAt?: string;
  resignedAt?: string;
  isDeleted: boolean;
  assignedAssetCount: number;
  companyTenure: string;
  contractBadge: EmployeeContractBadge;
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
        { email:        { $regex: search, $options: 'i' } },
        { department:   { $regex: search, $options: 'i' } },
      ]}
    : {};

  const [docs, total] = await Promise.all([
    Employee.find(query).sort({ employeeName: 1 }).skip(page * pageSize).limit(pageSize).lean(),
    Employee.countDocuments(query),
  ]);

  // Fetch assigned asset counts and contracts for all returned employees at once
  const employeeIds = docs.map((d) => d._id);
  const [assetCounts, contracts] = await Promise.all([
    Asset.aggregate([
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
    ]),
    Contract.find({
      employeeId: { $in: employeeIds },
      isDeleted: { $ne: true },
      issuedDate: { $exists: true },
    })
      .select('employeeId issuedDate endedAt')
      .lean(),
  ]);

  const countMap = new Map<string, number>();
  assetCounts.forEach((a) => {
    countMap.set(a._id.toString(), a.count);
  });

  const activeContractEmployees = new Set<string>();
  for (const contract of contracts) {
    if (
      contract.employeeId &&
      contract.issuedDate &&
      !contract.endedAt &&
      getContractLifecycleStatus(contract.issuedDate) === 'Active'
    ) {
      activeContractEmployees.add(contract.employeeId.toString());
    }
  }

  return {
    rows: docs.map((e) => {
      const id = e._id.toString();
      const hiredAt = e.hiredAt || (e as any).hireDate;
      const tenureEnd = e.status === 'Inactive' && e.resignedAt ? new Date(e.resignedAt) : new Date();
      const tenureMonths = hiredAt ? monthsElapsed(new Date(hiredAt), tenureEnd) : 0;

      const contractBadge: EmployeeContractBadge = activeContractEmployees.has(id)
        ? 'Active'
        : tenureMonths < 12
          ? 'None'
          : 'Eligible';

      return {
        _id: id,
        employeeName: e.employeeName,
        email: e.email ?? '',
        department: e.department,
        userType: e.userType,
        status: e.status,
        hiredAt: hiredAt?.toISOString(),
        resignedAt: e.resignedAt?.toISOString(),
        isDeleted: e.isDeleted,
        assignedAssetCount: countMap.get(id) ?? 0,
        companyTenure: formatTenureShort(tenureMonths),
        contractBadge,
      };
    }),
    total,
  };
}

export async function getEmployeeOptions(): Promise<{ _id: string; employeeName: string }[]> {
  await connectDB();
  // Only return active employees for assignment
  const docs = await Employee.find({ status: 'Active' }, { employeeName: 1 }).sort({ employeeName: 1 }).lean();
  return docs.map((e) => ({ _id: e._id.toString(), employeeName: e.employeeName }));
}
