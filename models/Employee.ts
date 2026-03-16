import { Schema, model, models, Document } from 'mongoose';

export const USER_TYPES = ['support', 'standard', 'standardplus', 'poweruser'] as const;
export type UserType = (typeof USER_TYPES)[number];

export interface IEmployee extends Document {
  employeeName: string;
  department: string;
  userType: UserType;
  location: string;
  hireDate?: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    userType: { type: String, enum: USER_TYPES, required: true },
    location: { type: String, required: true },
    hireDate: Date,
  },
  { timestamps: true }
);

export const Employee = models.Employee ?? model<IEmployee>('Employee', EmployeeSchema);
