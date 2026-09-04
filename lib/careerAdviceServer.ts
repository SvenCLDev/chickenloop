import 'server-only';

import connectDB from '@/lib/db';
import CareerAdvice from '@/models/CareerAdvice';
import mongoose from 'mongoose';

export interface CareerAdviceArticleServer {
  id: string;
  title: string;
  picture?: string;
  content: string;
  author: { id: string; name: string; email: string } | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getPublishedCareerAdviceArticles(): Promise<
  Pick<CareerAdviceArticleServer, 'id' | 'title' | 'updatedAt'>[]
> {
  await connectDB();
  const articles = await CareerAdvice.find({ published: true })
    .select('_id title updatedAt createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return articles.map((article) => ({
    id: article._id.toString(),
    title: article.title,
    updatedAt: (article.updatedAt ?? article.createdAt).toISOString(),
  }));
}

export async function getCareerAdviceArticleById(
  id: string,
): Promise<CareerAdviceArticleServer | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  await connectDB();
  const article = await CareerAdvice.findOne({ _id: id, published: true })
    .populate('author', 'name email')
    .lean();

  if (!article) {
    return null;
  }

  const authorDoc = article.author as unknown as
    | { _id: { toString(): string }; name: string; email: string }
    | null
    | undefined;

  return {
    id: article._id.toString(),
    title: article.title,
    picture: article.picture,
    content: article.content,
    author: authorDoc
      ? {
          id: authorDoc._id.toString(),
          name: authorDoc.name,
          email: authorDoc.email,
        }
      : null,
    published: article.published !== false,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}
