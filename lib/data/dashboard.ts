import { connectDB } from '@/lib/db/mongoose';
import { Asset } from '@/models/Asset';
import { Employee } from '@/models/Employee';
import { calculateValueAtDate } from '@/lib/depreciation';

export type AssetStatusStat = {
  status: string;
  count: number;
  cost: number;
  color: string;
};

export type AssetTypeStat = {
  type: string;
  label: string;
  count: number;
  cost: number;
  color: string;
};

export type AssetLifecycleStat = {
  stage: string;
  count: number;
  cost: number;
  color: string;
};

export type DepartmentCostStat = {
  department: string;
  count: number;
  cost: number;
};

export type LocationStat = {
  location: string;
  count: number;
};

export type AcquisitionYearStat = {
  year: string;
  count: number;
  cost: number;
};

export type WatchlistAsset = {
  _id: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  status?: string;
  location: string;
  ageInMonths: number;
  acquisitionCost: number;
  assignedTo?: string;
  lifecycle: string;
};

export type DashboardStats = {
  totalAssets: number;
  assignedCount: number;
  availableCount: number;
  orderedCount: number;
  retiredCount: number;
  totalAcquisitionCost: number;
  averageCost: number;
  bookValue: number;
  utilizationRate: number;
  riskCount: number;
  riskCost: number;
  byStatus: AssetStatusStat[];
  byType: AssetTypeStat[];
  byLifecycle: AssetLifecycleStat[];
  byCostCenter: DepartmentCostStat[];
  byLocation: LocationStat[];
  byAcquisitionYear: AcquisitionYearStat[];
  watchlist: WatchlistAsset[];
};

const STATUS_META = [
  { status: 'In Use', color: '#22c55e' },
  { status: 'In Stock', color: '#4085F0' },
  { status: 'Ordered', color: '#eab308' },
  { status: 'Retired', color: '#94a3b8' },
] as const;

const TYPE_META = [
  { type: 'laptop', label: 'Laptops', color: '#F05340' },
  { type: 'desktop', label: 'Desktops', color: '#4085F0' },
  { type: 'display', label: 'Displays', color: '#269066' },
] as const;

const LIFECYCLE = [
  { stage: 'New', maxMonths: 24, color: '#22c55e' },
  { stage: 'Mid-life', maxMonths: 42, color: '#eab308' },
  { stage: 'Near EOL', maxMonths: 48, color: '#f97316' },
  { stage: 'EOL', maxMonths: Infinity, color: '#ef4444' },
] as const;

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.44;

const normalizeLocation = (value?: string) => {
  const location = value?.trim();
  if (!location) return 'Unassigned';
  if (/^(ho|hq|head office)$/i.test(location)) return 'Head Office';
  if (/^wfh$/i.test(location)) return 'Work From Home';
  return location;
};

const lifecycleForMonths = (months: number) =>
  LIFECYCLE.find((stage) => months <= stage.maxMonths) ?? LIFECYCLE[LIFECYCLE.length - 1];

export async function getDashboardStats(): Promise<DashboardStats> {
  await connectDB();

  const assets = await Asset.find(
    {},
    {
      assetCode: 1,
      assetName: 1,
      assetType: 1,
      status: 1,
      location: 1,
      costCenter: 1,
      acquisitionDate: 1,
      acquisitionCost: 1,
      depreciationMethod: 1,
      currentAssignment: 1,
    }
  ).lean();

  const employeeIds = assets
    .map((asset) => asset.currentAssignment?.employeeId)
    .filter((id): id is NonNullable<typeof id> => !!id);

  const employees =
    employeeIds.length > 0
      ? await Employee.find({ _id: { $in: employeeIds } }, { employeeName: 1 }).lean()
      : [];
  const employeeNames = new Map(
    employees.map((employee) => [employee._id.toString(), employee.employeeName])
  );

  const now = new Date();
  const nowTime = now.getTime();

  const statusMap = new Map<string, AssetStatusStat>(
    STATUS_META.map((meta) => [meta.status, { ...meta, count: 0, cost: 0 }])
  );
  const typeMap = new Map<string, AssetTypeStat>(
    TYPE_META.map((meta) => [meta.type, { ...meta, count: 0, cost: 0 }])
  );
  const lifecycleMap = new Map<string, AssetLifecycleStat>(
    LIFECYCLE.map((meta) => [meta.stage, { ...meta, count: 0, cost: 0 }])
  );
  const departmentMap = new Map<string, DepartmentCostStat>();
  const locationMap = new Map<string, number>();
  const yearMap = new Map<string, { count: number; cost: number }>();

  let assignedCount = 0;
  let availableCount = 0;
  let orderedCount = 0;
  let retiredCount = 0;
  let totalAcquisitionCost = 0;
  let bookValue = 0;
  let riskCount = 0;
  let riskCost = 0;

  const watchlist: WatchlistAsset[] = [];

  for (const asset of assets) {
    const cost = asset.acquisitionCost ?? 0;
    totalAcquisitionCost += cost;

    if (asset.currentAssignment) assignedCount++;
    if (asset.status === 'In Stock') availableCount++;
    if (asset.status === 'Ordered') orderedCount++;
    if (asset.status === 'Retired') retiredCount++;

    const statusEntry =
      statusMap.get(asset.status ?? 'Unspecified') ??
      { status: asset.status ?? 'Unspecified', count: 0, cost: 0, color: '#94a3b8' };
    statusEntry.count++;
    statusEntry.cost += cost;
    statusMap.set(statusEntry.status, statusEntry);

    const typeEntry = typeMap.get(asset.assetType);
    if (typeEntry) {
      typeEntry.count++;
      typeEntry.cost += cost;
    }

    const ageInMonths = asset.acquisitionDate
      ? Math.max(0, Math.floor((nowTime - new Date(asset.acquisitionDate).getTime()) / MONTH_MS))
      : 0;
    const lifecycle = lifecycleForMonths(ageInMonths);
    const lifecycleEntry = lifecycleMap.get(lifecycle.stage);
    if (lifecycleEntry) {
      lifecycleEntry.count++;
      lifecycleEntry.cost += cost;
    }

    // Retired hardware no longer carries book value on the active portfolio.
    if (asset.status !== 'Retired' && asset.depreciationMethod && asset.acquisitionDate) {
      bookValue += calculateValueAtDate(
        cost,
        new Date(asset.acquisitionDate).toISOString(),
        asset.depreciationMethod,
        now,
        asset.currentAssignment?.assignedDate
          ? new Date(asset.currentAssignment.assignedDate).toISOString()
          : undefined
      );
    } else if (asset.status !== 'Retired') {
      bookValue += cost;
    }

    const department = asset.costCenter?.trim() || 'Unassigned';
    const departmentEntry = departmentMap.get(department) ?? {
      department,
      count: 0,
      cost: 0,
    };
    departmentEntry.count++;
    departmentEntry.cost += cost;
    departmentMap.set(department, departmentEntry);

    const location = normalizeLocation(asset.location);
    locationMap.set(location, (locationMap.get(location) ?? 0) + 1);

    if (asset.acquisitionDate) {
      const year = String(new Date(asset.acquisitionDate).getUTCFullYear());
      const yearEntry = yearMap.get(year) ?? { count: 0, cost: 0 };
      yearEntry.count++;
      yearEntry.cost += cost;
      yearMap.set(year, yearEntry);
    }

    const needsRefresh = lifecycle.stage === 'Near EOL' || lifecycle.stage === 'EOL';
    if (needsRefresh && asset.status !== 'Retired') {
      riskCount++;
      riskCost += cost;
      watchlist.push({
        _id: asset._id.toString(),
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        assetType: asset.assetType,
        status: asset.status,
        location: asset.location,
        ageInMonths,
        acquisitionCost: cost,
        assignedTo: asset.currentAssignment
          ? employeeNames.get(asset.currentAssignment.employeeId?.toString())
          : undefined,
        lifecycle: lifecycle.stage,
      });
    }
  }

  const departmentRows = [...departmentMap.values()].sort((a, b) => b.cost - a.cost);
  const byCostCenter =
    departmentRows.length > 7
      ? [
          ...departmentRows.slice(0, 7),
          {
            department: `Other (${departmentRows.length - 7})`,
            count: departmentRows.slice(7).reduce((sum, row) => sum + row.count, 0),
            cost: departmentRows.slice(7).reduce((sum, row) => sum + row.cost, 0),
          },
        ]
      : departmentRows;

  const locationRows = [...locationMap.entries()].sort((a, b) => b[1] - a[1]);
  const byLocation =
    locationRows.length > 6
      ? [
          ...locationRows.slice(0, 6).map(([location, count]) => ({ location, count })),
          {
            location: 'Other',
            count: locationRows.slice(6).reduce((sum, [, count]) => sum + count, 0),
          },
        ]
      : locationRows.map(([location, count]) => ({ location, count }));

  const lifecycleRank: Record<string, number> = { EOL: 0, 'Near EOL': 1 };
  watchlist.sort(
    (a, b) =>
      (lifecycleRank[a.lifecycle] ?? 2) - (lifecycleRank[b.lifecycle] ?? 2) ||
      b.ageInMonths - a.ageInMonths
  );

  const deployable = assignedCount + availableCount;

  return {
    totalAssets: assets.length,
    assignedCount,
    availableCount,
    orderedCount,
    retiredCount,
    totalAcquisitionCost,
    averageCost: assets.length > 0 ? totalAcquisitionCost / assets.length : 0,
    bookValue,
    utilizationRate: deployable > 0 ? (assignedCount / deployable) * 100 : 0,
    riskCount,
    riskCost,
    byStatus: [...statusMap.values()],
    byType: [...typeMap.values()],
    byLifecycle: [...lifecycleMap.values()],
    byCostCenter,
    byLocation,
    byAcquisitionYear: [...yearMap.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, entry]) => ({ year, ...entry })),
    watchlist: watchlist.slice(0, 8),
  };
}
