import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  emailVerifiedAt?: Date;
  rememberToken?: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    emailVerifiedAt: Date,
    rememberToken: String,
  },
  { timestamps: true }
);

export const User = models.User ?? model<IUser>('User', UserSchema);
