import { Schema, model, models, Document, Types } from 'mongoose';

export const LOG_ACTIONS = ['create', 'update', 'delete', 'assign', 'return'] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  userName: string; // denormalized
  action: LogAction;
  description: string;
  relatedModel: string;
  relatedId: Types.ObjectId;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: LOG_ACTIONS, required: true },
    description: { type: String, required: true },
    relatedModel: { type: String, required: true },
    relatedId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ relatedModel: 1, relatedId: 1 });

export const ActivityLog = models.ActivityLog ?? model<IActivityLog>('ActivityLog', ActivityLogSchema);
