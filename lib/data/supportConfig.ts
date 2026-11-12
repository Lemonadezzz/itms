import { connectDB } from '@/lib/db/mongoose';
import { SupportConfig, type CategoryAppliesTo } from '@/models/SupportConfig';
import type { TicketType } from '@/lib/support';

export type TicketCategory = {
  key: string;
  label: string;
  appliesTo: CategoryAppliesTo;
  active: boolean;
};

export type KnowledgeCategory = {
  key: string;
  label: string;
  active: boolean;
};

export type SupportConfigData = {
  ticketCategories: TicketCategory[];
  knowledgeCategories: KnowledgeCategory[];
};

export const DEFAULT_TICKET_CATEGORIES: TicketCategory[] = [
  { key: 'hardware', label: 'Hardware', appliesTo: 'Both', active: true },
  { key: 'software', label: 'Software', appliesTo: 'Both', active: true },
  { key: 'network', label: 'Network', appliesTo: 'Both', active: true },
  { key: 'accounts-access', label: 'Accounts & Access', appliesTo: 'Both', active: true },
  { key: 'other', label: 'Other', appliesTo: 'Both', active: true },
];

export const DEFAULT_KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { key: 'getting-started', label: 'Getting Started', active: true },
  { key: 'hardware', label: 'Hardware', active: true },
  { key: 'software', label: 'Software', active: true },
  { key: 'network', label: 'Network', active: true },
  { key: 'accounts-access', label: 'Accounts & Access', active: true },
];

/** Read the singleton config, falling back to the built-in defaults. */
export async function getSupportConfig(): Promise<SupportConfigData> {
  await connectDB();
  const doc = await SupportConfig.findOne({ key: 'default' }).lean();

  const ticketCategories = (doc?.ticketCategories ?? []) as TicketCategory[];
  const knowledgeCategories = (doc?.knowledgeCategories ?? []) as KnowledgeCategory[];

  return {
    ticketCategories: ticketCategories.length
      ? ticketCategories.map((c) => ({
          key: c.key,
          label: c.label,
          appliesTo: c.appliesTo,
          active: c.active ?? true,
        }))
      : DEFAULT_TICKET_CATEGORIES,
    knowledgeCategories: knowledgeCategories.length
      ? knowledgeCategories.map((c) => ({
          key: c.key,
          label: c.label,
          active: c.active ?? true,
        }))
      : DEFAULT_KNOWLEDGE_CATEGORIES,
  };
}

export async function getActiveTicketCategories(type?: TicketType): Promise<TicketCategory[]> {
  const config = await getSupportConfig();
  return config.ticketCategories.filter(
    (category) =>
      category.active &&
      (!type || category.appliesTo === 'Both' || category.appliesTo === type)
  );
}

export async function getActiveKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  const config = await getSupportConfig();
  return config.knowledgeCategories.filter((category) => category.active);
}
