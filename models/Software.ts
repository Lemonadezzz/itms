import { Schema, model, models, Document, Types } from 'mongoose';
import {
  SOFTWARE_CATEGORIES,
  SOFTWARE_LICENSE_TYPES,
  SOFTWARE_STATUSES,
  type SoftwareCategory,
  type SoftwareLicenseType,
  type SoftwareStatus,
} from '@/lib/software';

export interface ISoftware extends Document {
  softwareName: string;
  category: SoftwareCategory;
  status: SoftwareStatus;
  appOwner?: string;
  supportLink?: string;
  licenseType?: SoftwareLicenseType;
  supplierId?: Types.ObjectId;
  acquisitionDate?: Date;
  renewalDate?: Date;
  acquisitionCost?: number;
}

const SoftwareSchema = new Schema<ISoftware>(
  {
    softwareName: { type: String, required: true, trim: true },
    category: { type: String, enum: SOFTWARE_CATEGORIES, required: true },
    status: { type: String, enum: SOFTWARE_STATUSES, required: true, default: 'Active' },
    appOwner: { type: String, trim: true },
    supportLink: { type: String, trim: true },
    licenseType: { type: String, enum: SOFTWARE_LICENSE_TYPES },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    acquisitionDate: Date,
    renewalDate: Date,
    acquisitionCost: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export const Software = models.Software ?? model<ISoftware>('Software', SoftwareSchema);
