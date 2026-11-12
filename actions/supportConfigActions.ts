'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/mongoose';
import { SupportConfig } from '@/models/SupportConfig';
import { Ticket } from '@/models/Ticket';
import { KnowledgeArticle } from '@/models/KnowledgeArticle';
import { guardAction } from '@/lib/access';
import { writeLog } from '@/lib/activityLog';
import { slugify } from '@/lib/support';
import {
  DEFAULT_KNOWLEDGE_CATEGORIES,
  DEFAULT_TICKET_CATEGORIES,
  type KnowledgeCategory,
  type TicketCategory,
} from '@/lib/data/supportConfig';
import {
  UpsertKnowledgeCategorySchema,
  UpsertTicketCategorySchema,
} from '@/lib/validations';
import type { ActionResult } from '@/types';

const CONFIG_PATH = '/support/configuration';
const KB_PATH = '/support/knowledge-base';
const MY_TICKETS_PATH = '/support/my-tickets';
const QUEUE_PATH = '/tickets';

async function ensureConfig() {
  let config = await SupportConfig.findOne({ key: 'default' });
  if (!config) {
    config = await SupportConfig.create({
      key: 'default',
      ticketCategories: DEFAULT_TICKET_CATEGORIES,
      knowledgeCategories: DEFAULT_KNOWLEDGE_CATEGORIES,
    });
  }
  return config;
}

function revalidateSupport() {
  revalidatePath(CONFIG_PATH);
  revalidatePath(KB_PATH);
  revalidatePath(MY_TICKETS_PATH);
  revalidatePath(QUEUE_PATH);
}

export async function upsertTicketCategory(formData: unknown): Promise<ActionResult> {
  const guard = await guardAction('support', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = UpsertTicketCategorySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const config = await ensureConfig();
  const { key, label, appliesTo, active } = parsed.data;
  const categoryKey = key || slugify(label);
  const categories = config.ticketCategories as TicketCategory[];

  const existingIndex = categories.findIndex(
    (category) => category.key === categoryKey || (!key && category.label.toLowerCase() === label.toLowerCase())
  );

  if (existingIndex >= 0) {
    categories[existingIndex].label = label;
    categories[existingIndex].appliesTo = appliesTo;
    categories[existingIndex].active = active ?? categories[existingIndex].active;
  } else {
    if (categories.some((category) => category.label.toLowerCase() === label.toLowerCase())) {
      return { success: false, error: 'A ticket category with this name already exists.' };
    }
    categories.push({
      key: categoryKey,
      label,
      appliesTo,
      active: active ?? true,
    });
  }

  config.ticketCategories = categories;
  await config.save();

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: existingIndex >= 0 ? 'update' : 'create',
    description: `${existingIndex >= 0 ? 'Updated' : 'Created'} ticket category "${label}"`,
    relatedModel: 'SupportConfig',
    relatedId: config._id.toString(),
  });

  revalidateSupport();
  return { success: true, data: undefined };
}

export async function removeTicketCategory(key: string): Promise<ActionResult> {
  const guard = await guardAction('support', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const config = await ensureConfig();
  const categories = config.ticketCategories as TicketCategory[];
  const category = categories.find((item) => item.key === key);
  if (!category) return { success: false, error: 'Category not found.' };

  const inUse = await Ticket.countDocuments({ category: category.label });
  if (inUse > 0) {
    return {
      success: false,
      error: `This category is used by ${inUse} ticket${inUse === 1 ? '' : 's'}. Deactivate it instead.`,
    };
  }

  config.ticketCategories = categories.filter((item) => item.key !== key);
  await config.save();

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'delete',
    description: `Deleted ticket category "${category.label}"`,
    relatedModel: 'SupportConfig',
    relatedId: config._id.toString(),
  });

  revalidateSupport();
  return { success: true, data: undefined };
}

export async function upsertKnowledgeCategory(formData: unknown): Promise<ActionResult> {
  const guard = await guardAction('support', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = UpsertKnowledgeCategorySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const config = await ensureConfig();
  const { key, label, active } = parsed.data;
  const categoryKey = key || slugify(label);
  const categories = config.knowledgeCategories as KnowledgeCategory[];

  const existingIndex = categories.findIndex(
    (category) => category.key === categoryKey || (!key && category.label.toLowerCase() === label.toLowerCase())
  );

  if (existingIndex >= 0) {
    categories[existingIndex].label = label;
    categories[existingIndex].active = active ?? categories[existingIndex].active;
  } else {
    if (categories.some((category) => category.label.toLowerCase() === label.toLowerCase())) {
      return { success: false, error: 'A knowledge category with this name already exists.' };
    }
    categories.push({ key: categoryKey, label, active: active ?? true });
  }

  config.knowledgeCategories = categories;
  await config.save();

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: existingIndex >= 0 ? 'update' : 'create',
    description: `${existingIndex >= 0 ? 'Updated' : 'Created'} knowledge category "${label}"`,
    relatedModel: 'SupportConfig',
    relatedId: config._id.toString(),
  });

  revalidateSupport();
  return { success: true, data: undefined };
}

export async function removeKnowledgeCategory(key: string): Promise<ActionResult> {
  const guard = await guardAction('support', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const config = await ensureConfig();
  const categories = config.knowledgeCategories as KnowledgeCategory[];
  const category = categories.find((item) => item.key === key);
  if (!category) return { success: false, error: 'Category not found.' };

  const inUse = await KnowledgeArticle.countDocuments({ category: category.label });
  if (inUse > 0) {
    return {
      success: false,
      error: `This category is used by ${inUse} article${inUse === 1 ? '' : 's'}. Deactivate it instead.`,
    };
  }

  config.knowledgeCategories = categories.filter((item) => item.key !== key);
  await config.save();

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'delete',
    description: `Deleted knowledge category "${category.label}"`,
    relatedModel: 'SupportConfig',
    relatedId: config._id.toString(),
  });

  revalidateSupport();
  return { success: true, data: undefined };
}
