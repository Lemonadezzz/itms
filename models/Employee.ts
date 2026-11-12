import { Schema, model, models, Document, Types } from 'mongoose';

export const USER_TYPES = ['support', 'standard', 'standardplus', 'poweruser'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const EMPLOYEE_STATUSES = ['Active', 'Inactive'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface IEmployee extends Document {
  employeeName: string;
  email?: string;
  /** Denormalized department name, kept in sync with departmentId. */
  department: string;
  departmentId?: Types.ObjectId;
  userType: UserType;
  status: EmployeeStatus;
  hiredAt: Date;
  resignedAt?: Date;
  softwareIds: Types.ObjectId[];
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeName: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    department: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    userType: { type: String, enum: USER_TYPES, required: true },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'Active' },
    hiredAt: { type: Date, default: Date.now },
    resignedAt: { type: Date, default: null },
    softwareIds: [{ type: Schema.Types.ObjectId, ref: 'Software' }],
  },
  { timestamps: true }
);

export const Employee = models.Employee ?? model<IEmployee>('Employee', EmployeeSchema);
