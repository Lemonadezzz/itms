import { Schema, model, models } from 'mongoose';

export const CATEGORY_APPLIES_TO = ['Incident', 'Service Request', 'Both'] as const;
export type CategoryAppliesTo = (typeof CATEGORY_APPLIES_TO)[number];

export interface ITicketCategory {
  key: string;
  label: string;
  appliesTo: CategoryAppliesTo;
  active: boolean;
}

export interface IKnowledgeCategory {
  key: string;
  label: string;
  active: boolean;
}

export interface ISupportConfig {
  key: string;
  ticketCategories: ITicketCategory[];
  knowledgeCategories: IKnowledgeCategory[];
}

const TicketCategorySchema = new Schema<ITicketCategory>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    appliesTo: { type: String, enum: CATEGORY_APPLIES_TO, required: true, default: 'Both' },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const KnowledgeCategorySchema = new Schema<IKnowledgeCategory>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const SupportConfigSchema = new Schema<ISupportConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    ticketCategories: { type: [TicketCategorySchema], default: [] },
    knowledgeCategories: { type: [KnowledgeCategorySchema], default: [] },
  },
  { timestamps: true }
);

export const SupportConfig =
  models.SupportConfig ?? model<ISupportConfig>('SupportConfig', SupportConfigSchema);
