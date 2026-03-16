import { connectDB } from '@/lib/db/mongoose';
import { Ticket } from '@/models/Ticket';

export type TicketRow = {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  reportedByName: string;
  submittedDate: string;
  resolutionDate?: string;
};

export async function getTickets({
  page = 0,
  pageSize = 50,
  search = '',
  status = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<{ rows: TicketRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) query.$or = [
    { subject:        { $regex: search, $options: 'i' } },
    { ticketNumber:   { $regex: search, $options: 'i' } },
    { reportedByName: { $regex: search, $options: 'i' } },
  ];
  if (status) query.status = status;

  const [docs, total] = await Promise.all([
    Ticket.find(query).sort({ submittedDate: -1 }).skip(page * pageSize).limit(pageSize).lean(),
    Ticket.countDocuments(query),
  ]);

  return {
    rows: docs.map((t) => ({
      _id:            t._id.toString(),
      ticketNumber:   t.ticketNumber,
      subject:        t.subject,
      status:         t.status,
      reportedByName: t.reportedByName,
      submittedDate:  t.submittedDate.toISOString(),
      resolutionDate: t.resolutionDate?.toISOString(),
    })),
    total,
  };
}
