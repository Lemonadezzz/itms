'use server';

import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/models/User';
import { z } from 'zod';
import type { ActionResult } from '@/types';

const ProfileSchema = z.object({
  name:            z.string().min(1),
  email:           z.string().email(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).optional(),
}).refine((d) => {
  if (d.newPassword && !d.currentPassword) return false;
  return true;
}, { message: 'Current password is required to set a new password', path: ['currentPassword'] });

export async function updateProfile(formData: unknown): Promise<ActionResult> {
  const parsed = ProfileSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };

  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

  await connectDB();
  const user = await User.findById(session.user.id).select('+password');
  if (!user) return { success: false, error: 'User not found' };

  const { name, email, currentPassword, newPassword } = parsed.data;

  if (newPassword) {
    const valid = await bcrypt.compare(currentPassword!, user.password);
    if (!valid) return { success: false, error: 'Current password is incorrect' };
    user.password = await bcrypt.hash(newPassword, 12);
  }

  user.name  = name;
  user.email = email;
  await user.save();

  return { success: true, data: undefined };
}
