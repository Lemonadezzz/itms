'use server';

import { Types } from 'mongoose';
import { ActivityLog, LogAction } from '@/models/ActivityLog';

export async function writeLog({
  userId,
  userName,
  action,
  description,
  relatedModel,
  relatedId,
  assetCode,
  reason,
  fromEmployee,
  toEmployee,
}: {
  userId: string;
  userName: string;
  action: LogAction;
  description: string;
  relatedModel: string;
  relatedId: string;
  assetCode?: string;
  reason?: string;
  fromEmployee?: string;
  toEmployee?: string;
}) {
  try {
    const userOid = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : new Types.ObjectId('000000000000000000000000');
    const relatedOid = Types.ObjectId.isValid(relatedId) ? new Types.ObjectId(relatedId) : new Types.ObjectId('000000000000000000000000');
    await ActivityLog.create({
      userId:       userOid,
      userName,
      action,
      description,
      relatedModel,
      relatedId:    relatedOid,
      ...(assetCode && { assetCode }),
      ...(reason && { reason }),
      ...(fromEmployee && { fromEmployee }),
      ...(toEmployee && { toEmployee }),
    });
  } catch {
    // Non-fatal — log write failure should never break the main action
  }
}
