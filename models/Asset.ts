import { Schema, model, models, Document, Types } from 'mongoose';

export const ASSET_TYPES = ['laptop', 'desktop', 'display'] as const;
export const DEPRECIATION_METHODS = ['straight-line', 'declining-balance'] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export interface IAssignmentHistory {
  employeeId: Types.ObjectId;
  employeeName: string; // denormalized
  assignedDate: Date;
  returnedDate?: Date;
  notes?: string;
}

export interface ICurrentAssignment {
  employeeId: Types.ObjectId;
  assignedDate: Date;
  notes?: string;
}

export interface IAsset extends Document {
  assetName: string;
  assetCode: string;
  location: string;
  assetType: AssetType;
  acquisitionDate: Date;
  acquisitionCost: number;
  supplierId?: Types.ObjectId;
  depreciationMethod?: string;
  currentAssignment?: ICurrentAssignment;
  assignmentHistory: IAssignmentHistory[];
}

const AssignmentHistorySchema = new Schema<IAssignmentHistory>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    assignedDate: { type: Date, required: true },
    returnedDate: Date,
    notes: String,
  },
  { _id: false }
);

const CurrentAssignmentSchema = new Schema<ICurrentAssignment>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedDate: { type: Date, required: true },
    notes: String,
  },
  { _id: false }
);

const AssetSchema = new Schema<IAsset>(
  {
    assetName: { type: String, required: true },
    assetCode: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    assetType: { type: String, enum: ASSET_TYPES, required: true },
    acquisitionDate: { type: Date, required: true },
    acquisitionCost: { type: Number, required: true, min: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    depreciationMethod: { type: String, enum: DEPRECIATION_METHODS },
    currentAssignment: CurrentAssignmentSchema,
    assignmentHistory: { type: [AssignmentHistorySchema], default: [] },
  },
  { timestamps: true }
);

AssetSchema.index({ assetType: 1 });
AssetSchema.index({ 'currentAssignment.employeeId': 1 });

export const Asset = models.Asset ?? model<IAsset>('Asset', AssetSchema);
