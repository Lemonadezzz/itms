import { connectDB } from '@/lib/db/mongoose';
import { Software } from '@/models/Software';

export type SoftwareRow = {
  _id: string;
  softwareName: string;
  category: string;
  status: string;
  appOwner?: string;
  supportLink?: string;
  licenseType?: string;
  supplierId?: string;
  acquisitionDate?: string;
  renewalDate?: string;
  acquisitionCost?: number;
};

export async function getSoftwareOptions(): Promise<
  { _id: string; softwareName: string; category: string; status: string }[]
> {
  await connectDB();
  const docs = await Software.find(
    {},
    { softwareName: 1, category: 1, status: 1 }
  ).sort({ softwareName: 1 }).lean();
  return docs.map((s) => ({
    _id:          s._id.toString(),
    softwareName: s.softwareName,
    category:     s.category,
    status:       s.status,
  }));
}

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
      category:        s.category,
      status:          s.status,
      appOwner:        s.appOwner,
      supportLink:     s.supportLink,
      licenseType:     s.licenseType,
      supplierId:      s.supplierId?.toString(),
      acquisitionDate: s.acquisitionDate?.toISOString(),
      renewalDate:     s.renewalDate?.toISOString(),
      acquisitionCost: s.acquisitionCost,
    })),
    total,
  };
}
