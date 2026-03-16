import { connectDB } from '@/lib/db/mongoose';
import { Asset } from '@/models/Asset';

export type DashboardStats = {
  totalAssets: number;
  assignedCount: number;
  availableCount: number;
  byType: { type: string; count: number }[];
  byLifecycle: { stage: string; count: number; color: string }[];
  totalCost: number;
};

const LIFECYCLE = [
  { stage: 'New',      maxMonths: 24,       color: '#22c55e' },
  { stage: 'Mid-life', maxMonths: 42,       color: '#eab308' },
  { stage: 'Near EOL', maxMonths: 48,       color: '#f97316' },
  { stage: 'EOL',      maxMonths: Infinity, color: '#ef4444' },
];

export async function getDashboardStats(): Promise<DashboardStats> {
  await connectDB();

  const [assets, totalCostAgg] = await Promise.all([
    Asset.find({}, { assetType: 1, acquisitionDate: 1, currentAssignment: 1, acquisitionCost: 1 }).lean(),
    Asset.aggregate([{ $group: { _id: null, total: { $sum: '$acquisitionCost' } } }]),
  ]);

  const now = Date.now();
  const typeMap: Record<string, number> = {};
  const lifecycleMap: Record<string, number> = { New: 0, 'Mid-life': 0, 'Near EOL': 0, EOL: 0 };
  let assignedCount = 0;

  for (const a of assets) {
    typeMap[a.assetType] = (typeMap[a.assetType] ?? 0) + 1;
    if (a.currentAssignment) assignedCount++;

    const months = Math.floor((now - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const lc = LIFECYCLE.find((l) => months <= l.maxMonths)!;
    lifecycleMap[lc.stage]++;
  }

  return {
    totalAssets: assets.length,
    assignedCount,
    availableCount: assets.length - assignedCount,
    byType: Object.entries(typeMap).map(([type, count]) => ({ type, count })),
    byLifecycle: LIFECYCLE.map((l) => ({ stage: l.stage, count: lifecycleMap[l.stage], color: l.color })),
    totalCost: totalCostAgg[0]?.total ?? 0,
  };
}
