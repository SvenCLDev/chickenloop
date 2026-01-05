'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { careerAdviceApi } from '@/lib/api';
import Link from 'next/link';
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

export default function CareerAdvicePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await careerAdviceApi.getAll(); // Only published articles
      setArticles(data.articles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Career Advice</h1>
        <p className="text-gray-600 mb-8">
          Expert tips and insights to help advance your career
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No articles available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/career-advice/${article.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {article.picture && (
                  <div className="relative w-full h-48">
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
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




