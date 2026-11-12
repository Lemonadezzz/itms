import { Schema, model, models, Document } from 'mongoose';

export interface IRole extends Document {
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  editable: boolean;
}

const RoleSchema = new Schema<IRole>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    permissions: { type: [String], default: [] },
    editable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = models.Role ?? model<IRole>('Role', RoleSchema);
