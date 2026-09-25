import { connectDB } from '@/lib/db/mongoose';
import { Employee } from '@/models/Employee';

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
