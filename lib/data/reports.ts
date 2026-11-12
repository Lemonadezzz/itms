import { connectDB } from '@/lib/db/mongoose';
import { Ticket } from '@/models/Ticket';

export type ReportFilters = {
  from: Date;
  to: Date;
  type?: string;
  category?: string;
};

export type ReportsData = {
  totalThisMonth: number;
  totalInRange: number;
  resolvedInRange: number;
  averageResolutionMs: number;
  byCategory: { category: string; count: number }[];
  statusCounts: { status: string; count: number }[];
  monthlyTrends: { month: string; created: number; resolved: number }[];
  incidentFrequency: { month: string; count: number }[];
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return months;
}

function startOfTrailingMonths(count: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
}

export async function getReportsData({
  from,
  to,
  type = '',
  category = '',
}: ReportFilters): Promise<ReportsData> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match: Record<string, any> = {
    submittedDate: { $gte: from, $lte: to },
  };
  if (type) match.type = type;
  if (category) match.category = category;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const trendStart = startOfTrailingMonths(12);
  const months = monthRange(12);

  const [
    totalThisMonth,
    totalInRange,
    byCategoryAgg,
    statusAgg,
    resolutionAgg,
    createdTrendAgg,
    resolvedTrendAgg,
    incidentAgg,
  ] = await Promise.all([
    Ticket.countDocuments({ submittedDate: { $gte: monthStart, $lte: monthEnd } }),
    Ticket.countDocuments(match),
    Ticket.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Ticket.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Ticket.aggregate([
      {
        $match: {
          ...match,
          status: { $in: ['Resolved', 'Closed'] },
          $or: [
            { closedAt: { $exists: true, $ne: null } },
            { resolvedAt: { $exists: true, $ne: null } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          averageMs: {
            $avg: {
              $subtract: [{ $ifNull: ['$closedAt', '$resolvedAt'] }, '$submittedDate'],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Ticket.aggregate([
      { $match: { ...match, submittedDate: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$submittedDate' } },
          count: { $sum: 1 },
        },
      },
    ]),
    Ticket.aggregate([
      {
        $match: {
          ...match,
          submittedDate: { $gte: trendStart },
          resolvedAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$resolvedAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
    Ticket.aggregate([
      {
        $match: {
          ...match,
          type: 'Incident',
          submittedDate: { $gte: trendStart },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$submittedDate' } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const createdMap = new Map<string, number>(
    createdTrendAgg.map((row) => [String(row._id), row.count as number])
  );
  const resolvedMap = new Map<string, number>(
    resolvedTrendAgg.map((row) => [String(row._id), row.count as number])
  );
  const incidentMap = new Map<string, number>(
    incidentAgg.map((row) => [String(row._id), row.count as number])
  );

  return {
    totalThisMonth,
    totalInRange,
    resolvedInRange: (resolutionAgg[0]?.count as number) ?? 0,
    averageResolutionMs: (resolutionAgg[0]?.averageMs as number) ?? 0,
    byCategory: byCategoryAgg.map((row) => ({
      category: String(row._id ?? 'Other'),
      count: row.count as number,
    })),
    statusCounts: statusAgg.map((row) => ({
      status: String(row._id ?? 'Open'),
      count: row.count as number,
    })),
    monthlyTrends: months.map((month) => ({
      month,
      created: createdMap.get(month) ?? 0,
      resolved: resolvedMap.get(month) ?? 0,
    })),
    incidentFrequency: months.map((month) => ({
      month,
      count: incidentMap.get(month) ?? 0,
    })),
  };
}
