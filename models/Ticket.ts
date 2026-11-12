import { Schema, model, models, Document, Types } from 'mongoose';
import {
  AFFECTED_ITEM_TYPES,
  TICKET_STATUSES,
  TICKET_TYPES,
  type AffectedItemType,
  type TicketStatus,
  type TicketType,
} from '@/lib/support';

export { AFFECTED_ITEM_TYPES, TICKET_STATUSES, TICKET_TYPES };
export type { AffectedItemType, TicketStatus, TicketType };

export interface ITicketStatusEvent {
  status: TicketStatus;
  at: Date;
  byId?: Types.ObjectId;
  byName?: string;
}

export interface ITicket extends Document {
  ticketNumber: string;
  subject: string;
  description?: string;

  type: TicketType;
  category: string;
  status: TicketStatus;

  requestedForEmployeeId?: Types.ObjectId;
  requestedForUserId?: Types.ObjectId;
  requestedForName: string;

  createdBy: Types.ObjectId;
  createdByName: string;

  assignedTechnicianId?: Types.ObjectId;
  assignedTechnicianName?: string;
  resolvedById?: Types.ObjectId;
  resolvedByName?: string;
  closedById?: Types.ObjectId;
  closedByName?: string;

  affectedItemType: AffectedItemType;
  affectedAssetId?: Types.ObjectId;
  affectedAssetName?: string;
  affectedSoftwareId?: Types.ObjectId;
  affectedSoftwareName?: string;
  affectedItemOther?: string;

  submittedDate: Date;
  startedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  reopenedCount: number;
  lastReopenedAt?: Date;
  statusHistory: ITicketStatusEvent[];
}

const StatusEventSchema = new Schema<ITicketStatusEvent>(
  {
    status: { type: String, enum: TICKET_STATUSES, required: true },
    at: { type: Date, required: true },
    byId: { type: Schema.Types.ObjectId, ref: 'User' },
    byName: String,
  },
  { _id: false }
);

const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    type: { type: String, enum: TICKET_TYPES, required: true, default: 'Incident' },
    category: { type: String, required: true, default: 'Other', trim: true },
    status: { type: String, enum: TICKET_STATUSES, required: true, default: 'Open' },

    requestedForEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    requestedForUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    requestedForName: { type: String, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },

    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTechnicianName: String,
    resolvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedByName: String,
    closedById: { type: Schema.Types.ObjectId, ref: 'User' },
    closedByName: String,

    affectedItemType: { type: String, enum: AFFECTED_ITEM_TYPES, required: true, default: 'Other' },
    affectedAssetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    affectedAssetName: String,
    affectedSoftwareId: { type: Schema.Types.ObjectId, ref: 'Software' },
    affectedSoftwareName: String,
    affectedItemOther: String,

    submittedDate: { type: Date, required: true, default: Date.now },
    startedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    reopenedCount: { type: Number, default: 0 },
    lastReopenedAt: Date,
    statusHistory: { type: [StatusEventSchema], default: [] },
  },
  { timestamps: true }
);

TicketSchema.index({ status: 1 });
TicketSchema.index({ type: 1 });
TicketSchema.index({ category: 1 });
TicketSchema.index({ createdBy: 1 });
TicketSchema.index({ requestedForEmployeeId: 1 });
TicketSchema.index({ assignedTechnicianId: 1 });
TicketSchema.index({ submittedDate: -1 });

export const Ticket = models.Ticket ?? model<ITicket>('Ticket', TicketSchema);
