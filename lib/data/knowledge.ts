import { connectDB } from '@/lib/db/mongoose';
import { KnowledgeArticle } from '@/models/KnowledgeArticle';

export type KnowledgeArticleRow = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  category: string;
  tags: string[];
  status: string;
  authorName: string;
  updatedByName: string;
  publishedAt?: string;
  updatedAt: string;
};

export async function getKnowledgeArticles({
  search = '',
  category = '',
  status = '',
  includeDrafts = false,
  page = 0,
  pageSize = 50,
}: {
  search?: string;
  category?: string;
  status?: string;
  includeDrafts?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: KnowledgeArticleRow[]; total: number }> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (status) query.status = status;
  else if (!includeDrafts) query.status = 'Published';
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { summary: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  const [docs, total] = await Promise.all([
    KnowledgeArticle.find(query)
      .sort({ status: 1, updatedAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .lean(),
    KnowledgeArticle.countDocuments(query),
  ]);

  return {
    rows: docs.map((article) => ({
      _id: article._id.toString(),
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      category: article.category,
      tags: article.tags ?? [],
      status: article.status,
      authorName: article.authorName,
      updatedByName: article.updatedByName,
      publishedAt: article.publishedAt?.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getArticleOptions(): Promise<{ _id: string; title: string }[]> {
  await connectDB();
  const docs = await KnowledgeArticle.find(
    { status: 'Published' },
    { title: 1 }
  )
    .sort({ title: 1 })
    .lean();
  return docs.map((article) => ({ _id: article._id.toString(), title: article.title }));
}
