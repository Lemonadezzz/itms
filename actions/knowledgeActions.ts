'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/mongoose';
import { KnowledgeArticle } from '@/models/KnowledgeArticle';
import { guardAction } from '@/lib/access';
import { writeLog } from '@/lib/activityLog';
import { slugify } from '@/lib/support';
import {
  CreateKnowledgeArticleSchema,
  UpdateKnowledgeArticleSchema,
} from '@/lib/validations';
import type { ActionResult } from '@/types';

const KB_PATH = '/support/knowledge-base';

function parseTags(raw?: string): string[] {
  return raw
    ? raw.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];
}

async function uniqueSlug(title: string, ignoreId?: string): Promise<string> {
  const base = slugify(title) || `article-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (
    await KnowledgeArticle.exists({
      slug: candidate,
      ...(ignoreId ? { _id: { $ne: ignoreId } } : {}),
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function createArticle(formData: unknown): Promise<ActionResult<string>> {
  const guard = await guardAction('knowledge', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = CreateKnowledgeArticleSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const { title, summary, content, category, tags, status } = parsed.data;
  const article = await KnowledgeArticle.create({
    title,
    slug: await uniqueSlug(title),
    summary,
    content,
    category,
    tags: parseTags(tags),
    status,
    authorId: guard.access.userId,
    authorName: guard.access.name,
    updatedByName: guard.access.name,
    publishedAt: status === 'Published' ? new Date() : undefined,
  });

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'create',
    description: `Created knowledge article "${title}"`,
    relatedModel: 'KnowledgeArticle',
    relatedId: article._id.toString(),
  });

  revalidatePath(KB_PATH);
  return { success: true, data: article._id.toString() };
}

export async function updateArticle(id: string, formData: unknown): Promise<ActionResult> {
  const guard = await guardAction('knowledge', 'manage');
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = UpdateKnowledgeArticleSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' };
  }

  await connectDB();
  const article = await KnowledgeArticle.findById(id);
  if (!article) return { success: false, error: 'Article not found.' };

  const { title, summary, content, category, tags, status } = parsed.data;
  article.title = title;
  article.summary = summary;
  article.content = content;
  article.category = category;
  article.tags = parseTags(tags);
  article.updatedByName = guard.access.name;
  if (status === 'Published' && !article.publishedAt) article.publishedAt = new Date();
  if (status === 'Draft') article.publishedAt = undefined;
  article.status = status;
  await article.save();

  await writeLog({
    userId: guard.access.userId,
    userName: guard.access.name,
    action: 'update',
    description: `Updated knowledge article "${title}"`,
    relatedModel: 'KnowledgeArticle',
    relatedId: id,
  });

  revalidatePath(KB_PATH);
  return { success: true, data: undefined };
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  const guard = await guardAction('knowledge', 'delete');
  if (!guard.ok) return { success: false, error: guard.error };

  await connectDB();
  const article = await KnowledgeArticle.findByIdAndDelete(id);
  if (article) {
    await writeLog({
      userId: guard.access.userId,
      userName: guard.access.name,
      action: 'delete',
      description: `Deleted knowledge article "${article.title}"`,
      relatedModel: 'KnowledgeArticle',
      relatedId: id,
    });
  }

  revalidatePath(KB_PATH);
  return { success: true, data: undefined };
}
