'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { careerAdviceApi } from '@/lib/api';
import Image from 'next/image';

export default function NewCareerAdvicePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    picture: '',
    content: '',
    published: true,
  });
  const [selectedPicture, setSelectedPicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string>('');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type: ${file.name}. Only images (JPEG, PNG, WEBP, GIF) are allowed.`);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File "${file.name}" is too large (${fileSizeMB} MB). Maximum size is 5MB.`);
      return;
    }

    setSelectedPicture(file);
    setError('');

    // Create preview
    const preview = URL.createObjectURL(file);
    setPicturePreview(preview);
  };

  const removePicture = () => {
    if (picturePreview) {
      URL.revokeObjectURL(picturePreview);
    }
    setSelectedPicture(null);
    setPicturePreview('');
    setFormData({ ...formData, picture: '' });
  };

  const uploadPicture = async (): Promise<string | null> => {
    if (!selectedPicture) return formData.picture || null;

    setUploadingPicture(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('picture', selectedPicture);

      const response = await fetch('/api/career-advice/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      // Safely parse JSON response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload picture');
      }

      return data.url;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload picture';
      setError(errorMessage);
      return null;
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Upload picture first if selected
      const pictureUrl = await uploadPicture();
      if (selectedPicture && !pictureUrl) {
        setLoading(false);
        return; // Error already set by uploadPicture
      }

      // Create article
      await careerAdviceApi.create({
        title: formData.title,
        picture: pictureUrl || undefined,
        content: formData.content,
        published: formData.published,
      });

      router.push('/admin?section=career-advice');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create article';
      setError(errorMessage);
      // Scroll to error banner
      setTimeout(() => {
        const errorBanner = document.getElementById('error-banner');
        if (errorBanner) {
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Career Advice Article</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="picture" className="block text-sm font-medium text-gray-700 mb-1">
              Picture
            </label>
            {picturePreview || formData.picture ? (
              <div className="mb-4">
                <div className="relative w-full h-64 mb-2 rounded-lg overflow-hidden border border-gray-300">
                  <Image
                    src={picturePreview || formData.picture}
                    alt="Preview"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      console.error('Image load error:', e);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={removePicture}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove Picture
                </button>
              </div>
            ) : null}
            <input
              id="picture"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handlePictureChange}
              disabled={uploadingPicture}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum file size: 5MB. Supported formats: JPEG, PNG, WEBP, GIF
            </p>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content * (HTML supported)
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
              placeholder="Enter article content. HTML formatting is supported (e.g., &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;h1&gt;, &lt;h2&gt;, etc.)"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can use HTML tags for formatting. Examples: &lt;p&gt;paragraph&lt;/p&gt;, &lt;strong&gt;bold&lt;/strong&gt;, &lt;ul&gt;&lt;li&gt;list item&lt;/li&gt;&lt;/ul&gt;
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Published</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Unpublished articles will not be visible on the public Career Advice page
            </p>
          </div>

          {/* Error banner near submit button */}
          {error && (
            <div id="error-banner" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError('')}
                  className="text-red-700 hover:text-red-900 ml-4"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading || uploadingPicture}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Article'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/career-advice')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


