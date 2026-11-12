import { Schema, model, models, Document, Types } from 'mongoose';

export const ARTICLE_STATUSES = ['Draft', 'Published'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export interface IKnowledgeArticle extends Document {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  category: string;
  tags: string[];
  status: ArticleStatus;
  authorId: Types.ObjectId;
  authorName: string;
  updatedByName: string;
  publishedAt?: Date;
}

const KnowledgeArticleSchema = new Schema<IKnowledgeArticle>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    summary: { type: String, trim: true },
    content: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ARTICLE_STATUSES, required: true, default: 'Draft' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    updatedByName: { type: String, required: true },
    publishedAt: Date,
  },
  { timestamps: true }
);

KnowledgeArticleSchema.index({ status: 1 });
KnowledgeArticleSchema.index({ category: 1 });
KnowledgeArticleSchema.index({ title: 'text', summary: 'text', content: 'text' });

export const KnowledgeArticle =
  models.KnowledgeArticle ?? model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
