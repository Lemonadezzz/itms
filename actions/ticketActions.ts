'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { Ticket } from '@/models/Ticket';
import { CreateTicketSchema } from '@/lib/validations';
import { writeLog } from '@/lib/activityLog';
import type { ActionResult } from '@/types';

async function getActor() {
  const session = await auth();
  return {
    userId:   session?.user?.id   ?? 'system',
    userName: session?.user?.name ?? 'system',
  };
}

async function generateTicketNumber(): Promise<string> {
  const count = await Ticket.countDocuments();
  return `TKT-${String(count + 1).padStart(5, '0')}`;
}

export async function createTicket(formData: unknown): Promise<ActionResult<string>> {
  const parsed = CreateTicketSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const ticketNumber = await generateTicketNumber();
  const ticket = await Ticket.create({ ...parsed.data, ticketNumber });
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'create', description: `Created ticket ${ticketNumber}`, relatedModel: 'Ticket', relatedId: ticket._id.toString() });
  revalidatePath('/tickets');
  return { success: true, data: ticket._id.toString() };
}

export async function updateTicket(id: string, formData: unknown): Promise<ActionResult> {
  const parsed = CreateTicketSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  await connectDB();
  const ticket = await Ticket.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!ticket) return { success: false, error: 'Ticket not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Updated ticket ${ticket.ticketNumber}`, relatedModel: 'Ticket', relatedId: id });
  revalidatePath('/tickets');
  return { success: true, data: undefined };
}

export async function updateTicketStatus(id: string, status: 'Open' | 'In-Progress' | 'Closed'): Promise<ActionResult> {
  await connectDB();
  const update: Record<string, unknown> = { status };
  if (status === 'Closed') update.resolutionDate = new Date();
  const ticket = await Ticket.findByIdAndUpdate(id, update, { new: true });
  if (!ticket) return { success: false, error: 'Ticket not found' };
  const { userId, userName } = await getActor();
  await writeLog({ userId, userName, action: 'update', description: `Set ticket ${ticket.ticketNumber} to ${status}`, relatedModel: 'Ticket', relatedId: id });
  revalidatePath('/tickets');
  return { success: true, data: undefined };
}

export async function deleteTicket(id: string): Promise<ActionResult> {
  await connectDB();
  const ticket = await Ticket.findByIdAndDelete(id);
  const { userId, userName } = await getActor();
  if (ticket) await writeLog({ userId, userName, action: 'delete', description: `Deleted ticket ${ticket.ticketNumber}`, relatedModel: 'Ticket', relatedId: id });
  revalidatePath('/tickets');
  return { success: true, data: undefined };
}
