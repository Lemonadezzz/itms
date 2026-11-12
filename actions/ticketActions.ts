'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/mongoose';
import { Ticket, type TicketStatus } from '@/models/Ticket';
import { Counter } from '@/models/Counter';
import { User } from '@/models/User';
import { Employee } from '@/models/Employee';
import { Asset } from '@/models/Asset';
import { Software } from '@/models/Software';
import { TECHNICIAN_ROLES } from '@/lib/roles';
import { getAccess, guardAction, type Access } from '@/lib/access';
import { writeLog } from '@/lib/activityLog';
import { getActiveTicketCategories } from '@/lib/data/supportConfig';
import { REQUESTER_TRANSITIONS, TECHNICIAN_TRANSITIONS } from '@/lib/support';
import {
  AssignTicketSchema,
  CreateTicketSchema,
  UpdateTicketStatusSchema,
} from '@/lib/validations';
import type { ActionResult } from '@/types';

const MY_TICKETS_PATH = '/support/my-tickets';
const QUEUE_PATH = '/tickets';

async function nextTicketNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'ticket' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `TKT-${String(counter?.seq ?? 1).padStart(5, '0')}`;
}

type ParsedTicket = ReturnType<typeof CreateTicketSchema.parse>;

async function resolveReferences(data: ParsedTicket, access: Access) {
  // Requested for — "self", an employee id, or a standalone user id.
  let requestedForEmployeeId: string | undefined;
  let requestedForUserId: string | undefined;
  let requestedForName = '';

  if (data.requestedFor === 'self' || data.requestedFor === access.userId) {
    const current = await User.findById(access.userId).select('name employeeId').lean();
    requestedForName = current?.name ?? access.name;
    if (current?.employeeId) {
      const employee = await Employee.findById(current.employeeId).select('employeeName').lean();
      requestedForEmployeeId = current.employeeId.toString();
      requestedForName = employee?.employeeName ?? requestedForName;
    } else {
      requestedForUserId = access.userId;
    }
  } else {
    let employee = null;
    try {
      employee = await Employee.findById(data.requestedFor).select('employeeName').lean();
    } catch {
      employee = null;
    }
    if (employee) {
      requestedForEmployeeId = employee._id.toString();
      requestedForName = employee.employeeName;
    } else {
      const user = await User.findById(data.requestedFor).select('name status').lean();
      if (!user) return { ok: false as const, error: 'Requested-for person not found.' };
      requestedForUserId = user._id.toString();
      requestedForName = user.name;
    }
  }

  // Affected item
  let affectedAssetId: string | undefined;
  let affectedAssetName: string | undefined;
  let affectedSoftwareId: string | undefined;
  let affectedSoftwareName: string | undefined;
  let affectedItemOther: string | undefined;

  if (data.affectedItemType === 'Hardware') {
    if (!data.affectedAssetId) {
      return { ok: false as const, error: 'Select the affected hardware.' };
    }
    const asset = await Asset.findById(data.affectedAssetId).select('assetCode assetName').lean();
    if (!asset) return { ok: false as const, error: 'Affected hardware not found.' };
    affectedAssetId = asset._id.toString();
    affectedAssetName = `${asset.assetCode} — ${asset.assetName}`;
  } else if (data.affectedItemType === 'Software') {
    if (!data.affectedSoftwareId) {
      return { ok: false as const, error: 'Select the affected software.' };
    }
    const software = await Software.findById(data.affectedSoftwareId).select('softwareName').lean();
    if (!software) return { ok: false as const, error: 'Affected software not found.' };
    affectedSoftwareId = software._id.toString();
    affectedSoftwareName = software.softwareName;
  } else {
    if (!data.affectedItemOther?.trim()) {
      return { ok: false as const, error: 'Describe the affected item.' };
    }
    affectedItemOther = data.affectedItemOther.trim();
  }

  const categories = await getActiveTicketCategories(data.type);
  if (!categories.some((category) => category.label === data.category)) {
    return { ok: false as const, error: 'Select a valid category for this ticket type.' };
  }

  return {
    ok: true as const,
    data: {
      requestedForEmployeeId,
      requestedForUserId,
      requestedForName,
      affectedAssetId,
      affectedAssetName,
      affectedSoftwareId,
      affectedSoftwareName,
      affectedItemOther,
    },
  };
}

async function isRequester(
  ticket: {
    createdBy: unknown;
    requestedForUserId?: unknown;
    requestedForEmployeeId?: unknown;
  },
  access: Access
): Promise<boolean> {
  if (ticket.createdBy?.toString() === access.userId) return true;
  if (ticket.requestedForUserId?.toString() === access.userId) return true;
  if (ticket.requestedForEmployeeId) {
    const user = await User.findById(access.userId).select('employeeId').lean();
    return user?.employeeId?.toString() === ticket.requestedForEmployeeId.toString();
  }
  return false;
}

/** Any signed-in user can submit a ticket for themselves or on behalf of someone. */
export async function createTicket(formData: unknown): Promise<ActionResult<string>> {
  const access = await getAccess();
  if (!access) return { success: false, error: 'You must be signed in to create a ticket.' };

  const parsed = CreateTicketSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const references = await resolveReferences(parsed.data, access);
  if (!references.ok) return { success: false, error: references.error };

  const now = new Date();
  const ticketNumber = await nextTicketNumber();
  const ticket = await Ticket.create({
    ticketNumber,
    subject: parsed.data.subject,
    description: parsed.data.description,
    type: parsed.data.type,
    category: parsed.data.category,
    status: 'Open',
    ...references.data,
    createdBy: access.userId,
    createdByName: access.name,
    affectedItemType: parsed.data.affectedItemType,
    submittedDate: now,
    statusHistory: [{ status: 'Open', at: now, byId: access.userId, byName: access.name }],
  });

  await writeLog({
    userId: access.userId,
    userName: access.name,
    action: 'create',
    description: `Created ticket ${ticketNumber}`,
    relatedModel: 'Ticket',
    relatedId: ticket._id.toString(),
  });

  revalidatePath(MY_TICKETS_PATH);
  revalidatePath(QUEUE_PATH);
  return { success: true, data: ticket._id.toString() };
}

export async function updateTicket(id: string, formData: unknown): Promise<ActionResult> {
  const access = await getAccess();
  if (!access) return { success: false, error: 'You must be signed in to update a ticket.' };

  await connectDB();
  const ticket = await Ticket.findById(id);
  if (!ticket) return { success: false, error: 'Ticket not found.' };

  const canManage = access.permissions.includes('tickets.manage');
  const creatorCanEdit = (await isRequester(ticket, access)) && ticket.status === 'Open';
  if (!canManage && !creatorCanEdit) {
    return { success: false, error: 'You cannot edit this ticket.' };
  }

  const parsed = CreateTicketSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  const references = await resolveReferences(parsed.data, access);
  if (!references.ok) return { success: false, error: references.error };

  ticket.subject = parsed.data.subject;
  ticket.description = parsed.data.description;
  ticket.type = parsed.data.type;
  ticket.category = parsed.data.category;
  ticket.affectedItemType = parsed.data.affectedItemType;
  ticket.requestedForEmployeeId = references.data.requestedForEmployeeId
    ? (references.data.requestedForEmployeeId as unknown as typeof ticket.requestedForEmployeeId)
    : undefined;
  ticket.requestedForUserId = references.data.requestedForUserId
    ? (references.data.requestedForUserId as unknown as typeof ticket.requestedForUserId)
    : undefined;
  ticket.requestedForName = references.data.requestedForName;
  ticket.affectedAssetId = references.data.affectedAssetId
    ? (references.data.affectedAssetId as unknown as typeof ticket.affectedAssetId)
    : undefined;
  ticket.affectedAssetName = references.data.affectedAssetName;
  ticket.affectedSoftwareId = references.data.affectedSoftwareId
    ? (references.data.affectedSoftwareId as unknown as typeof ticket.affectedSoftwareId)
    : undefined;
  ticket.affectedSoftwareName = references.data.affectedSoftwareName;
  ticket.affectedItemOther = references.data.affectedItemOther;
  await ticket.save();

  await writeLog({
    userId: access.userId,
    userName: access.name,
    action: 'update',
    description: `Updated ticket ${ticket.ticketNumber}`,
    relatedModel: 'Ticket',
    relatedId: id,
  });

  revalidatePath(MY_TICKETS_PATH);
  revalidatePath(QUEUE_PATH);
  return { success: true, data: undefined };
}

export async function assignTicket(id: string, technicianId: string): Promise<ActionResult> {
  const guard = await guardAction('tickets', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };
  if (!guard.access.isTechnician) {
    return { success: false, error: 'Only technicians can assign tickets.' };
  }

  const parsed = AssignTicketSchema.safeParse({ technicianId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const technician = await User.findOne({
    _id: parsed.data.technicianId,
    roleKey: { $in: TECHNICIAN_ROLES },
    status: 'Active',
  }).select('name').lean();
  if (!technician) return { success: false, error: 'Technician not found.' };

  const ticket = await Ticket.findById(id);
  if (!ticket) return { success: false, error: 'Ticket not found.' };
  if (ticket.status === 'Closed') {
    return { success: false, error: 'Closed tickets cannot be reassigned.' };
  }

  ticket.assignedTechnicianId = technician._id as unknown as typeof ticket.assignedTechnicianId;
  ticket.assignedTechnicianName = technician.name;
  if (!ticket.startedAt && ticket.status === 'Open') {
    ticket.status = 'In Progress';
    ticket.startedAt = new Date();
    ticket.statusHistory.push({
      status: 'In Progress',
      at: ticket.startedAt,
      byId: technician._id as unknown as typeof ticket.createdBy,
      byName: technician.name,
    });
  }
  await ticket.save();

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'assign',
    description: `Assigned ticket ${ticket.ticketNumber} to ${technician.name}`,
    relatedModel: 'Ticket',
    relatedId: id,
  });

  revalidatePath(MY_TICKETS_PATH);
  revalidatePath(QUEUE_PATH);
  return { success: true, data: undefined };
}



export async function updateTicketStatus(id: string, status: TicketStatus): Promise<ActionResult> {
  const access = await getAccess();
  if (!access) return { success: false, error: 'You must be signed in to update a ticket.' };

  const parsed = UpdateTicketStatusSchema.safeParse({ status });
  if (!parsed.success) return { success: false, error: 'Invalid ticket status.' };

  await connectDB();
  const ticket = await Ticket.findById(id);
  if (!ticket) return { success: false, error: 'Ticket not found.' };

  const current = ticket.status as TicketStatus;
  const target = parsed.data.status;

  const technicianCan = access.isTechnician && access.permissions.includes('tickets.manage');
  const requesterCan = await isRequester(ticket, access);

  if (technicianCan) {
    if (!TECHNICIAN_TRANSITIONS[current].includes(target)) {
      return { success: false, error: `A ${current} ticket cannot move to ${target}.` };
    }
  } else if (requesterCan) {
    if (!REQUESTER_TRANSITIONS[current]?.includes(target)) {
      return { success: false, error: 'You can only reopen or close a resolved ticket.' };
    }
  } else {
    return { success: false, error: 'You do not have permission to update this ticket.' };
  }

  const now = new Date();
  ticket.status = target;
  if (target === 'In Progress') {
    ticket.startedAt ??= now;
    if (!ticket.assignedTechnicianId && access.isTechnician) {
      ticket.assignedTechnicianId = access.userId as unknown as typeof ticket.assignedTechnicianId;
      ticket.assignedTechnicianName = access.name;
    }
  }
  if (target === 'Resolved') {
    ticket.resolvedAt = now;
    ticket.resolvedById = access.userId as unknown as typeof ticket.resolvedById;
    ticket.resolvedByName = access.name;
  }
  if (target === 'Closed') {
    ticket.closedAt = now;
    ticket.closedById = access.userId as unknown as typeof ticket.closedById;
    ticket.closedByName = access.name;
  }
  if (current === 'Resolved' && target === 'Open') {
    ticket.reopenedCount = (ticket.reopenedCount ?? 0) + 1;
    ticket.lastReopenedAt = now;
    ticket.resolvedAt = undefined;
    ticket.resolvedById = undefined;
    ticket.resolvedByName = undefined;
  }

  ticket.statusHistory.push({
    status: target,
    at: now,
    byId: access.userId as unknown as typeof ticket.createdBy,
    byName: access.name,
  });
  await ticket.save();

  await writeLog({
    userId: access.userId,
    userName: access.name,
    action: 'update',
    description: `Set ticket ${ticket.ticketNumber} to ${target}`,
    relatedModel: 'Ticket',
    relatedId: id,
  });

  revalidatePath(MY_TICKETS_PATH);
  revalidatePath(QUEUE_PATH);
  return { success: true, data: undefined };
}

export async function deleteTicket(id: string): Promise<ActionResult> {
  const guard = await guardAction('tickets', 'delete');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const ticket = await Ticket.findByIdAndDelete(id);
  if (ticket) {
    await writeLog({
      userId: guard.access.userId,
      userName: guard.access.name,
      action: 'delete',
      description: `Deleted ticket ${ticket.ticketNumber}`,
      relatedModel: 'Ticket',
      relatedId: id,
    });
  }

  revalidatePath(MY_TICKETS_PATH);
  revalidatePath(QUEUE_PATH);
  return { success: true, data: undefined };
}
