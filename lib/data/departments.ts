import { connectDB } from '@/lib/db/mongoose';
import { Department } from '@/models/Department';

export type DepartmentRow = {
  _id: string;
  departmentName: string;
  description?: string;
};

export type DepartmentOption = {
  _id: string;
  departmentName: string;
};

export async function getDepartmentOptions(): Promise<DepartmentOption[]> {
  await connectDB();
  const docs = await Department.find({}, { departmentName: 1 }).sort({ departmentName: 1 }).lean();
  return docs.map((d) => ({ _id: d._id.toString(), departmentName: d.departmentName }));
}

export async function getDepartments({
  page = 0,
  pageSize = 50,
  search = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ rows: DepartmentRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = search
    ? {
        $or: [
          { departmentName: { $regex: search, $options: 'i' } },
          { description:    { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const [docs, total] = await Promise.all([
    Department.find(query).sort({ departmentName: 1 }).skip(page * pageSize).limit(pageSize).lean(),
    Department.countDocuments(query),
  ]);

  return {
    rows: docs.map((d) => ({
      _id:            d._id.toString(),
      departmentName: d.departmentName,
      description:    d.description,
    })),
    total,
  };
}
