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
}: {
  userId: string;
  userName: string;
  action: LogAction;
  description: string;
  relatedModel: string;
  relatedId: string;
}) {
  try {
    await ActivityLog.create({
      userId:       new Types.ObjectId(userId),
      userName,
      action,
      description,
      relatedModel,
      relatedId:    new Types.ObjectId(relatedId),
    });
  } catch {
    // Non-fatal — log write failure should never break the main action
  }
}
