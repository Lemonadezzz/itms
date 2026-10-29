import { connectDB } from '@/lib/db/mongoose';
import { Asset } from '@/models/Asset';

export type DashboardStats = {
  totalAssets: number;
  assignedCount: number;
  availableCount: number;
  byLifecycle: { stage: string; count: number; color: string }[];
  byCostPerDepartment: { department: string; cost: number }[];
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
    Asset.find({}, { assetType: 1, costCenter: 1, acquisitionDate: 1, currentAssignment: 1, acquisitionCost: 1 }).lean(),
    Asset.aggregate([{ $group: { _id: null, total: { $sum: '$acquisitionCost' } } }]),
  ]);

  const now = Date.now();
  const lifecycleMap: Record<string, number> = { New: 0, 'Mid-life': 0, 'Near EOL': 0, EOL: 0 };
  const deptCostMap: Record<string, number> = {};
  let assignedCount = 0;

  for (const a of assets) {
    if (a.currentAssignment) assignedCount++;

    // Cost is attributed to the asset's cost center (the department it was
    // originally purchased for), falling back to Unassigned when not set.
    const costCenter = a.costCenter?.trim() || 'Unassigned';
    deptCostMap[costCenter] = (deptCostMap[costCenter] ?? 0) + a.acquisitionCost;

    // Handle assets without acquisitionDate (use 0 months for new items)
    let months = 0;
    if (a.acquisitionDate) {
      months = Math.floor((now - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    }

    const lc = LIFECYCLE.find((l) => months <= l.maxMonths);
    if (lc) lifecycleMap[lc.stage]++;
  }

  return {
    totalAssets: assets.length,
    assignedCount,
    availableCount: assets.length - assignedCount,
    byLifecycle: LIFECYCLE.map((l) => ({ stage: l.stage, count: lifecycleMap[l.stage], color: l.color })),
    byCostPerDepartment: Object.entries(deptCostMap)
      .map(([department, cost]) => ({ department, cost }))
      .sort((a, b) => b.cost - a.cost),
    totalCost: totalCostAgg[0]?.total ?? 0,
  };
}
