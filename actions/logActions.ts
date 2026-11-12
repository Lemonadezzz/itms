'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/mongoose';
import { ActivityLog } from '@/models/ActivityLog';
import { getAccess } from '@/lib/access';
import { writeLog } from '@/lib/activityLog';
import type { ActionResult } from '@/types';

export async function clearLogs(): Promise<ActionResult<{ deleted: number }>> {
  const access = await getAccess();
  if (!access) return { success: false, error: 'You must be signed in to clear logs.' };
  if (!access.isDeveloper) {
    return { success: false, error: 'Only a Developer can clear activity logs.' };
  }

  await connectDB();
  const result = await ActivityLog.deleteMany({});

  // Keep an audit trail of the destructive action itself.
  await writeLog({
    userId: access.userId,
    userName: access.name,
    action: 'delete',
    description: `Cleared ${result.deletedCount} activity log${result.deletedCount === 1 ? '' : 's'}`,
    relatedModel: 'System',
    relatedId: access.userId,
  });

  revalidatePath('/assets/logs');
  return { success: true, data: { deleted: result.deletedCount } };
}
