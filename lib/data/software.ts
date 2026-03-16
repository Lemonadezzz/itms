import { connectDB } from '@/lib/db/mongoose';
import { Software } from '@/models/Software';

export type SoftwareRow = {
  _id: string;
  softwareName: string;
  licenseType: string;
  acquisitionDate: string;
  acquisitionCost: number;
  monthlyCost?: number;
  supplierId?: string;
};

export async function getSoftware({
  page = 0,
  pageSize = 50,
  search = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ rows: SoftwareRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = search
    ? { softwareName: { $regex: search, $options: 'i' } }
    : {};

  const [docs, total] = await Promise.all([
    Software.find(query).sort({ softwareName: 1 }).skip(page * pageSize).limit(pageSize).lean(),
    Software.countDocuments(query),
  ]);

  return {
    rows: docs.map((s) => ({
      _id:             s._id.toString(),
      softwareName:    s.softwareName,
      licenseType:     s.licenseType,
      acquisitionDate: s.acquisitionDate.toISOString(),
      acquisitionCost: s.acquisitionCost,
      monthlyCost:     s.monthlyCost,
      supplierId:      s.supplierId?.toString(),
    })),
    total,
  };
}
