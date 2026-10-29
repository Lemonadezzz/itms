import { Schema, model, models, Document } from 'mongoose';

export const USER_TYPES = ['support', 'standard', 'standardplus', 'poweruser'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const EMPLOYEE_STATUSES = ['Active', 'Inactive'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface IEmployee extends Document {
  employeeName: string;
  email?: string;
  department: string;
  userType: UserType;
  status: EmployeeStatus;
  hiredAt: Date;
  resignedAt?: Date;
  isDeleted: boolean;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeName: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    department: { type: String, required: true },
    userType: { type: String, enum: USER_TYPES, required: true },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'Active' },
    hiredAt: { type: Date, default: Date.now },
    resignedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Employee = models.Employee ?? model<IEmployee>('Employee', EmployeeSchema);
