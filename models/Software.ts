import { Schema, model, models, Document, Types } from 'mongoose';

export const LICENSE_TYPES = ['monthly', 'annually', '3_years', 'perpetual'] as const;
export type LicenseType = (typeof LICENSE_TYPES)[number];

export interface ISoftware extends Document {
  softwareName: string;
  acquisitionDate: Date;
  licenseType: LicenseType;
  supplierId?: Types.ObjectId;
  acquisitionCost: number;
  monthlyCost?: number;
}

const SoftwareSchema = new Schema<ISoftware>(
  {
    softwareName: { type: String, required: true },
    acquisitionDate: { type: Date, required: true },
    licenseType: { type: String, enum: LICENSE_TYPES, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    acquisitionCost: { type: Number, required: true, min: 0 },
    monthlyCost: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export const Software = models.Software ?? model<ISoftware>('Software', SoftwareSchema);
