import { Schema, model, models, Document, Types } from 'mongoose';

export const USER_STATUSES = ['Active', 'Inactive'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  employeeId?: Types.ObjectId;
  roleKey: string;
  status: UserStatus;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  rememberToken?: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', unique: true, sparse: true },
    roleKey: { type: String, default: 'user', required: true },
    status: { type: String, enum: USER_STATUSES, default: 'Active' },
    lastLoginAt: Date,
    emailVerifiedAt: Date,
    rememberToken: String,
  },
  { timestamps: true }
);

export const User = models.User ?? model<IUser>('User', UserSchema);
