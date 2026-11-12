import { Types } from 'mongoose';
import { connectDB } from '@/lib/db/mongoose';
import { Ticket, type ITicket } from '@/models/Ticket';
import { User } from '@/models/User';
import { Employee } from '@/models/Employee';
import { Asset } from '@/models/Asset';
import { Software } from '@/models/Software';
import { TECHNICIAN_ROLES } from '@/lib/roles';
import { getActiveTicketCategories, type TicketCategory } from '@/lib/data/supportConfig';

export type TicketStatusEventRow = {
  status: string;
  at: string;
  byName?: string;
};

export type TicketRow = {
  _id: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  type: string;
  category: string;
  status: string;
  requestedForEmployeeId?: string;
  requestedForUserId?: string;
  requestedForName: string;
  createdById: string;
  createdByName: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  resolvedByName?: string;
  closedByName?: string;
  affectedItemType: string;
  affectedAssetId?: string;
  affectedSoftwareId?: string;
  affectedItemName?: string;
  affectedItemOther?: string;
  submittedDate: string;
  startedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  reopenedCount: number;
  statusHistory: TicketStatusEventRow[];
};

export type TechnicianOption = {
  _id: string;
  name: string;
  email: string;
  roleKey: string;
};

export type TicketStatusCounts = {
  total: number;
  Open: number;
  'In Progress': number;
  Pending: number;
  Resolved: number;
  Closed: number;
};

function emptyCounts(): TicketStatusCounts {
  return { total: 0, Open: 0, 'In Progress': 0, Pending: 0, Resolved: 0, Closed: 0 };
}

async function countByStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: Record<string, any>
): Promise<TicketStatusCounts> {
  await connectDB();
  const rows = await Ticket.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = emptyCounts();
  for (const row of rows) {
    const status = String(row._id) as keyof TicketStatusCounts;
    if (status in counts && status !== 'total') {
      counts[status] = row.count as number;
    }
    counts.total += row.count as number;
  }
  return counts;
}

/** Status totals for tickets the signed-in user owns or raised on someone's behalf. */
export async function getMyTicketCounts(userId: string): Promise<TicketStatusCounts> {
  await connectDB();
  const user = await User.findById(userId).select('employeeId').lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownership: Record<string, any>[] = [
    { createdBy: new Types.ObjectId(userId) },
    { requestedForUserId: new Types.ObjectId(userId) },
  ];
  if (user?.employeeId) ownership.push({ requestedForEmployeeId: user.employeeId });

  return countByStatus({ $or: ownership });
}

export async function getTicketQueueCounts(): Promise<TicketStatusCounts> {
  return countByStatus({});
}

export type TicketEmployeeOption = {
  _id: string;
  employeeName: string;
  email?: string;
  softwareIds: string[];
};

export type TicketAssetOption = {
  _id: string;
  label: string;
  employeeId?: string;
};

export type TicketSoftwareOption = {
  _id: string;
  softwareName: string;
};

type LeanTicket = Omit<ITicket, '_id'> & { _id: { toString(): string } };

function toRow(ticket: LeanTicket): TicketRow {
  const affectedItemName =
    ticket.affectedItemType === 'Hardware'
      ? ticket.affectedAssetName
      : ticket.affectedItemType === 'Software'
        ? ticket.affectedSoftwareName
        : ticket.affectedItemOther;

  return {
    _id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    type: ticket.type,
    category: ticket.category,
    status: ticket.status,
    requestedForEmployeeId: ticket.requestedForEmployeeId?.toString(),
    requestedForUserId: ticket.requestedForUserId?.toString(),
    requestedForName: ticket.requestedForName,
    createdById: ticket.createdBy?.toString() ?? '',
    createdByName: ticket.createdByName,
    assignedTechnicianId: ticket.assignedTechnicianId?.toString(),
    assignedTechnicianName: ticket.assignedTechnicianName,
    resolvedByName: ticket.resolvedByName,
    closedByName: ticket.closedByName,
    affectedItemType: ticket.affectedItemType,
    affectedAssetId: ticket.affectedAssetId?.toString(),
    affectedSoftwareId: ticket.affectedSoftwareId?.toString(),
    affectedItemName,
    affectedItemOther: ticket.affectedItemOther,
    submittedDate: ticket.submittedDate.toISOString(),
    startedAt: ticket.startedAt?.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString(),
    closedAt: ticket.closedAt?.toISOString(),
    reopenedCount: ticket.reopenedCount ?? 0,
    statusHistory: (ticket.statusHistory ?? []).map((event) => ({
      status: event.status,
      at: event.at.toISOString(),
      byName: event.byName,
    })),
  };
}

/** Tickets created by, requested for, or requested on behalf of the signed-in user. */
export async function getMyTickets({
  userId,
  page = 0,
  pageSize = 50,
  search = '',
  status = '',
}: {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<{ rows: TicketRow[]; total: number }> {
  await connectDB();

  const user = await User.findById(userId).select('employeeId').lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownership: Record<string, any>[] = [
    { createdBy: userId },
    { requestedForUserId: userId },
  ];
  if (user?.employeeId) ownership.push({ requestedForEmployeeId: user.employeeId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = { $or: ownership };
  if (search) {
    query.$and = [
      {
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { ticketNumber: { $regex: search, $options: 'i' } },
          { requestedForName: { $regex: search, $options: 'i' } },
        ],
      },
    ];
  }
  if (status) query.status = status;

  const [docs, total] = await Promise.all([
    Ticket.find(query).sort({ submittedDate: -1 }).skip(page * pageSize).limit(pageSize).lean(),
    Ticket.countDocuments(query),
  ]);

  return { rows: docs.map((doc) => toRow(doc as unknown as LeanTicket)), total };
}

/** Full queue for technicians and admins. */
export async function getTicketQueue({
  userId,
  page = 0,
  pageSize = 50,
  search = '',
  status = '',
  type = '',
  category = '',
  assignee = '',
}: {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  type?: string;
  category?: string;
  assignee?: string;
}): Promise<{ rows: TicketRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) {
    query.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { ticketNumber: { $regex: search, $options: 'i' } },
      { requestedForName: { $regex: search, $options: 'i' } },
      { createdByName: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) query.status = status;
  if (type) query.type = type;
  if (category) query.category = category;
  if (assignee === 'me') query.assignedTechnicianId = userId;
  else if (assignee === 'unassigned') query.assignedTechnicianId = { $exists: false };
  else if (assignee) query.assignedTechnicianId = assignee;

  const [docs, total] = await Promise.all([
    Ticket.find(query).sort({ submittedDate: -1 }).skip(page * pageSize).limit(pageSize).lean(),
    Ticket.countDocuments(query),
  ]);

  return { rows: docs.map((doc) => toRow(doc as unknown as LeanTicket)), total };
}

export async function getTicketById(id: string): Promise<TicketRow | null> {
  await connectDB();
  let doc;
  try {
    doc = await Ticket.findById(id).lean();
  } catch {
    return null;
  }
  return doc ? toRow(doc as unknown as LeanTicket) : null;
}

export async function getTechnicians(): Promise<TechnicianOption[]> {
  await connectDB();
  const docs = await User.find(
    { roleKey: { $in: TECHNICIAN_ROLES }, status: 'Active' },
    { name: 1, email: 1, roleKey: 1 }
  )
    .sort({ name: 1 })
    .lean();

  return docs.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    roleKey: user.roleKey,
  }));
}

export type TicketFormOptions = {
  employees: TicketEmployeeOption[];
  assets: TicketAssetOption[];
  software: TicketSoftwareOption[];
  categories: TicketCategory[];
  technicians: TechnicianOption[];
  currentUser: { _id: string; name: string; employeeId?: string; employeeName?: string };
};

export async function getTicketFormOptions(userId: string): Promise<TicketFormOptions> {
  await connectDB();

  const [user, employees, assets, software, categories, technicians] = await Promise.all([
    User.findById(userId).select('name employeeId').lean(),
    Employee.find(
      { status: 'Active' },
      { employeeName: 1, email: 1, softwareIds: 1 }
    )
      .sort({ employeeName: 1 })
      .lean(),
    Asset.find(
      { status: { $ne: 'Retired' } },
      { assetCode: 1, assetName: 1, currentAssignment: 1 }
    )
      .sort({ assetCode: 1 })
      .lean(),
    Software.find({}, { softwareName: 1 }).sort({ softwareName: 1 }).lean(),
    getActiveTicketCategories(),
    getTechnicians(),
  ]);

  const employeeName = user?.employeeId
    ? employees.find((employee) => employee._id.toString() === user.employeeId?.toString())?.employeeName
    : undefined;

  return {
    employees: employees.map((employee) => ({
      _id: employee._id.toString(),
      employeeName: employee.employeeName,
      email: employee.email,
      softwareIds: (employee.softwareIds ?? []).map((id: unknown) => String(id)),
    })),
    assets: assets.map((asset) => ({
      _id: asset._id.toString(),
      label: `${asset.assetCode} — ${asset.assetName}`,
      employeeId: asset.currentAssignment?.employeeId?.toString(),
    })),
    software: software.map((item) => ({
      _id: item._id.toString(),
      softwareName: item.softwareName,
    })),
    categories,
    technicians,
    currentUser: {
      _id: userId,
      name: user?.name ?? 'Unknown',
      employeeId: user?.employeeId?.toString(),
      employeeName,
    },
  };
}
