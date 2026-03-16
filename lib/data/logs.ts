import { connectDB } from '@/lib/db/mongoose';
import { ActivityLog } from '@/models/ActivityLog';

export type LogRow = {
  _id: string;
  userName: string;
  action: string;
  description: string;
  relatedModel: string;
  createdAt: string;
};

export async function getLogs({
  page = 0,
  pageSize = 50,
  search = '',
  action = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
}): Promise<{ rows: LogRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) query.$or = [
    { userName:    { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];
  if (action) query.action = action;

  const [docs, total] = await Promise.all([
    ActivityLog.find(query).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize).lean(),
    ActivityLog.countDocuments(query),
  ]);

  return {
    rows: docs.map((l) => ({
      _id:          l._id.toString(),
      userName:     l.userName,
      action:       l.action,
      description:  l.description,
      relatedModel: l.relatedModel,
      createdAt:    (l as unknown as { createdAt: Date }).createdAt.toISOString(),
    })),
    total,
  };
}
