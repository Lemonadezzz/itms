import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { ActivityLog } from '@/models/ActivityLog';
import { Asset } from '@/models/Asset';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  const logs = await ActivityLog.find({ relatedModel: 'Asset', relatedId: id })
    .sort({ createdAt: 1 })
    .lean();

  const asset = await Asset.findById(id).lean();
  const assignmentHistory = asset?.assignmentHistory ?? [];

  const entries: { date: string; action: string; details: string }[] = [];

  if (asset?.createdAt) {
    entries.push({
      date: new Date(asset.createdAt).toISOString(),
      action: 'Asset created',
      details: '-',
    });
  }

  for (const log of logs) {
    const date = log.createdAt ? new Date(log.createdAt).toISOString() : '';

    switch (log.action) {
      case 'assign': {
        const emp = log.toEmployee ?? 'Unknown';
        entries.push({ date, action: 'Assign', details: `Assigned to ${emp}` });
        break;
      }
      case 'return': {
        const emp = log.fromEmployee ?? 'Unknown';
        entries.push({ date, action: 'Return', details: `${emp} > Returned` });
        break;
      }
      case 'ASSET_TRANSFER': {
        const oldEmp = log.fromEmployee ?? 'Unknown';
        const newEmp = log.toEmployee ?? 'Unknown';
        entries.push({ date, action: 'Transfer', details: `${oldEmp} > ${newEmp}` });
        break;
      }
      case 'ASSET_DECOMMISSION': {
        const reason = log.reason || 'No reason provided';
        entries.push({ date, action: 'Decommission', details: reason });
        break;
      }
      case 'ASSET_RECOMMISSION': {
        entries.push({ date, action: 'Recommission', details: 'Returned to service' });
        break;
      }
      default:
        break;
    }
  }

  return NextResponse.json(entries);
}
