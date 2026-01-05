'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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

export default function CareerAdviceAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadArticles();
    }
  }, [user]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await careerAdviceApi.getAll(true); // Include unpublished
      setArticles(data.articles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) {
      return;
    }

    try {
      setDeletingId(id);
      await careerAdviceApi.delete(id);
      setArticles(articles.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete article');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Career Advice Articles</h1>
          <Link
            href="/admin/career-advice/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create New Article
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No articles found.</p>
            <Link
              href="/admin/career-advice/new"
              className="text-blue-600 hover:text-blue-800"
            >
              Create your first article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <div
                key={article.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${
                  !article.published ? 'opacity-60' : ''
                }`}
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
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                      {article.title}
                    </h3>
                    {!article.published && (
                      <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/career-advice/${article.id}/edit`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-center text-sm rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deletingId === article.id}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === article.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}






