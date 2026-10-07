'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Navbar from '@/app/components/Navbar';
import { authApi } from '@/lib/api';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const t = useTranslations('Login');
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const hasAttemptedLogin = useRef(false);

  useEffect(() => {
    if (!authLoading && user && !hasAttemptedLogin.current) {
      router.replace('/recruiter');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    hasAttemptedLogin.current = true;
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('failed');
      setError(message || t('failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const redirectTo =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null;
    const callbackUrl = redirectTo
      ? `/auth/post-login?redirect=${encodeURIComponent(redirectTo)}`
      : '/auth/post-login';
    await signIn('google', { callbackUrl });
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess(false);
    const emailToUse = forgotEmail.trim().toLowerCase() || email.trim().toLowerCase();
    if (!emailToUse) {
      setForgotError(t('forgotEmailRequired'));
      return;
    }
    setForgotLoading(true);
    try {
      await authApi.forgotPassword({ email: emailToUse });
      setForgotSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('forgotFailed');
      setForgotError(message || t('forgotFailed'));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">{t('title')}</h1>
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full mb-4 bg-white border border-gray-300 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-50 font-semibold"
          >
            {t('continueWithGoogle')}
          </button>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <button
                type="button"
                onClick={() => {
                  setShowForgotForm(!showForgotForm);
                  if (!showForgotForm) setForgotEmail(email);
                  setForgotSuccess(false);
                  setForgotError('');
                }}
                className="mt-1 text-sm text-blue-600 hover:underline"
              >
                {t('forgotPassword')}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>
          {showForgotForm && (
            <div className="border-t pt-4 mt-4 space-y-3">
              {forgotSuccess && (
                <p className="text-sm text-gray-600">{t('forgotSuccess')}</p>
              )}
              {forgotError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                  {forgotError}
                </div>
              )}
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('email')}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={t('forgotPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                  >
                    {forgotLoading ? t('sending') : t('sendResetLink')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotForm(false);
                      setForgotSuccess(false);
                      setForgotError('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}
          <p className="mt-4 text-center text-sm text-gray-600">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              {t('registerHere')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
