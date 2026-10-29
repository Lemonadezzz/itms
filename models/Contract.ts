import { Schema, model, models, Document, Types } from 'mongoose';

export interface IContract extends Document {
  employeeId: Types.ObjectId;
  employeeName: string; // denormalized
  assetId: Types.ObjectId;
  assetName: string;    // denormalized
  assetCode: string;    // denormalized
  issuedDate: Date;
  numberOfMonths: number;
  perCutoff: number;
  totalContribution: number;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    assetName: { type: String, required: true },
    assetCode: { type: String, required: true },
    issuedDate: { type: Date, required: true },
    numberOfMonths: { type: Number, required: true, min: 1 },
    perCutoff: { type: Number, required: true, min: 0 },
    totalContribution: { type: Number, required: true, min: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ContractSchema.index({ employeeId: 1 });
ContractSchema.index({ assetId: 1 });

export const Contract = models.Contract ?? model<IContract>('Contract', ContractSchema);
