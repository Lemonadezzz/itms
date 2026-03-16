import { Schema, model, models, Document, Types } from 'mongoose';

export const TICKET_STATUSES = ['Open', 'In-Progress', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface ITicket extends Document {
  ticketNumber: string;
  submittedDate: Date;
  resolutionDate?: Date;
  subject: string;
  details?: string;
  status: TicketStatus;
  reportedBy: Types.ObjectId;
  reportedByName: string; // denormalized
}

const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    submittedDate: { type: Date, required: true, default: Date.now },
    resolutionDate: Date,
    subject: { type: String, required: true },
    details: String,
    status: { type: String, enum: TICKET_STATUSES, required: true, default: 'Open' },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    reportedByName: { type: String, required: true },
  },
  { timestamps: true }
);

TicketSchema.index({ ticketNumber: 1 });
TicketSchema.index({ status: 1 });

export const Ticket = models.Ticket ?? model<ITicket>('Ticket', TicketSchema);
