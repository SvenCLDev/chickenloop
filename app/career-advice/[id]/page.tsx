'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { careerAdviceApi } from '@/lib/api';
import Image from 'next/image';

interface Article {
  id: string;
  title: string;
  picture?: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
  } | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CareerAdviceArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = (params?.id as string) || '';

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const data = await careerAdviceApi.getOne(articleId);
      setArticle(data.article);
    } catch (err: any) {
      setError(err.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Article not found'}
          </div>
          <button
            onClick={() => router.push('/career-advice')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Career Advice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/career-advice')}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Career Advice
        </button>

        <article className="bg-white rounded-lg shadow-md overflow-hidden">
          {article.picture && (
            <div className="relative w-full h-96">
              <Image
                src={article.picture}
                alt={article.title}
                fill
                className="object-cover"
                onError={(e) => {
                  console.error('Image load error:', e);
                }}
              />
            </div>
          )}
          <div className="p-6 md:p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>
            <div className="flex items-center text-sm text-gray-500 mb-6">
              <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              {article.author && (
                <>
                  <span className="mx-2">•</span>
                  <span>By {article.author.name}</span>
                </>
              )}
            </div>
            <div
              className="prose prose-lg max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

