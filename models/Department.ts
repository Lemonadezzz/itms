import { Schema, model, models, Document } from 'mongoose';

export interface IDepartment extends Document {
  departmentName: string;
  description?: string;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    departmentName: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Department = models.Department ?? model<IDepartment>('Department', DepartmentSchema);
