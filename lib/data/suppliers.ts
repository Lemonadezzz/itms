import { connectDB } from '@/lib/db/mongoose';
import { Supplier } from '@/models/Supplier';

export type SupplierRow = {
  _id: string;
  supplierName: string;
  contactPerson?: string;
  email?: string;
  telephoneNumber?: string;
  categories: string[];
};

export async function getSuppliers({
  page = 0,
  pageSize = 50,
  search = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ rows: SupplierRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = search
    ? { $or: [
        { supplierName:  { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ]}
    : {};

  const [docs, total] = await Promise.all([
    Supplier.find(query).sort({ supplierName: 1 }).skip(page * pageSize).limit(pageSize).lean(),
    Supplier.countDocuments(query),
  ]);

  return {
    rows: docs.map((s) => ({
      _id:             s._id.toString(),
      supplierName:    s.supplierName,
      contactPerson:   s.contactPerson,
      email:           s.email,
      telephoneNumber: s.telephoneNumber,
      categories:      s.categories,
    })),
    total,
  };
}

export async function getSupplierOptions(): Promise<{ _id: string; supplierName: string }[]> {
  await connectDB();
  const docs = await Supplier.find({}, { supplierName: 1 }).sort({ supplierName: 1 }).lean();
  return docs.map((s) => ({ _id: s._id.toString(), supplierName: s.supplierName }));
}
