import { Schema, model, models, Document, Types } from 'mongoose';

export const LOG_ACTIONS = ['create', 'update', 'delete', 'assign', 'return', 'PRE_DELIVERY_INTAKE', 'CONFIRM_DELIVERY', 'ASSET_TRANSFER', 'ASSET_MAINTENANCE_START', 'ASSET_MAINTENANCE_END', 'ASSET_DECOMMISSION', 'ASSET_RECOMMISSION', 'offboard', 'reactivate'] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  userName: string; // denormalized
  action: LogAction;
  description: string;
  relatedModel: string;
  relatedId: Types.ObjectId;
  assetCode?: string;
  reason?: string;
  fromEmployee?: string;
  toEmployee?: string;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: LOG_ACTIONS, required: true },
    description: { type: String, required: true },
    relatedModel: { type: String, required: true },
    relatedId: { type: Schema.Types.ObjectId, required: true },
    assetCode: { type: String },
    reason: { type: String },
    fromEmployee: { type: String },
    toEmployee: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ relatedModel: 1, relatedId: 1 });

export const ActivityLog = models.ActivityLog ?? model<IActivityLog>('ActivityLog', ActivityLogSchema);
