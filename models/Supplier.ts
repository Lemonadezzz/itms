import { Schema, model, models, Document } from 'mongoose';

export interface ISupplier extends Document {
  supplierName: string;
  contactPerson?: string;
  email?: string;
  telephoneNumber?: string;
  categories: string[];
}

const SupplierSchema = new Schema<ISupplier>(
  {
    supplierName: { type: String, required: true },
    contactPerson: String,
    email: { type: String, lowercase: true },
    telephoneNumber: String,
    categories: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Supplier = models.Supplier ?? model<ISupplier>('Supplier', SupplierSchema);
