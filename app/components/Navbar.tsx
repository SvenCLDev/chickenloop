'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '../contexts/AuthContext';
import LocaleSwitcher from './LocaleSwitcher';

export default function Navbar({ logoPriority = true }: { logoPriority?: boolean }) {
  const t = useTranslations('Nav');
  const tCommon = useTranslations('Common');
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isRecruiter = user && (user.role === 'recruiter' || user.role === 'admin');
  const isJobSeeker = user && user.role === 'job-seeker';
  const isAdmin = user?.role === 'admin';

  const dashboardHref =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'recruiter'
        ? '/recruiter'
        : '/job-seeker';

  return (
    <>
      <nav className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center h-16">
            <div className="flex items-center flex-shrink-0">
              <Link href="/" onClick={handleLogoClick} className="relative block h-16 w-[480px] overflow-visible">
                <Image
                  src="/CL-2026-v3.png"
                  alt={t('logoAlt')}
                  width={480}
                  height={128}
                  priority={logoPriority}
                  fetchPriority={logoPriority ? 'high' : 'auto'}
                  className="absolute left-0 -top-[5px] h-32 w-auto max-w-none"
                />
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              <Link href="/jobs" className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors">
                {t('jobs')}
              </Link>
              <Link href="/companies" className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors">
                {t('companies')}
              </Link>
              <Link href="/talent" className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors">
                {t('talent')}
              </Link>
              <Link href="/career-advice" className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors">
                {t('guides')}
              </Link>
              <Link href="/map" className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors">
                {t('map')}
              </Link>
              {isAdmin && (
                <Link href="/maintenance-log" className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors">
                  {t('maintenanceLog')}
                </Link>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <LocaleSwitcher />
              {!(user && isJobSeeker) && (
                <Link
                  href="/recruiter/jobs/new"
                  className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-sm transition-colors shadow-sm"
                >
                  {t('postJob')}
                </Link>
              )}
              {!(user && isRecruiter) && (
                <Link
                  href="/job-seeker/profile/new"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-400 font-medium text-sm transition-colors"
                >
                  {t('postResume')}
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="px-4 py-2 text-white hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                  >
                    {t('dashboard')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-white hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                  >
                    {t('logout')}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 text-white hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden relative flex justify-between items-center h-16">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-white hover:text-blue-100 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300"
              aria-label={t('toggleMenu')}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="absolute left-1/2 top-0 flex h-full -translate-x-1/2 items-start pt-[5px]">
              <Link href="/" onClick={handleLogoClick} className="flex items-start">
                <Image
                  src="/CL-2026-v3.png"
                  alt={t('logoAlt')}
                  width={300}
                  height={80}
                  priority={logoPriority}
                  fetchPriority={logoPriority ? 'high' : 'auto'}
                  className="block h-auto w-auto max-h-[100px]"
                />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              {!(user && isJobSeeker) && (
                <Link
                  href="/recruiter/jobs/new"
                  className="px-3 py-1.5 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-xs transition-colors shadow-sm"
                  onClick={closeMobileMenu}
                >
                  {t('postJob')}
                </Link>
              )}
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-blue-700 bg-blue-600">
              <div className="flex flex-col pt-2">
                <div className="px-4 py-2 border-b border-blue-700 mb-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    {t('primaryActions')}
                  </h3>
                  <div className="flex flex-col space-y-1">
                    {!(user && isJobSeeker) && (
                      <Link
                        href="/recruiter/jobs/new"
                        onClick={closeMobileMenu}
                        className="px-4 py-2.5 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-sm text-center transition-colors"
                      >
                        {t('postJob')}
                      </Link>
                    )}
                    {!(user && isRecruiter) && (
                      <Link
                        href="/job-seeker/profile/new"
                        onClick={closeMobileMenu}
                        className="px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-400 font-medium text-sm text-center transition-colors"
                      >
                        {t('postResume')}
                      </Link>
                    )}
                    {user ? (
                      <>
                        <Link
                          href={dashboardHref}
                          onClick={closeMobileMenu}
                          className="px-4 py-2.5 text-white hover:bg-blue-700 rounded-md font-medium text-sm text-center transition-colors"
                        >
                          {t('dashboard')}
                        </Link>
                        <button
                          onClick={() => {
                            closeMobileMenu();
                            handleLogout();
                          }}
                          className="px-4 py-2.5 text-white hover:bg-blue-700 rounded-md font-medium text-sm text-center transition-colors"
                        >
                          {t('logout')}
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        onClick={closeMobileMenu}
                        className="px-4 py-2.5 text-white hover:bg-blue-700 rounded-md font-medium text-sm text-center transition-colors"
                      >
                        {t('login')}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="px-4 py-2 border-b border-blue-700 mb-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    {t('browse')}
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <Link href="/jobs" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('jobs')}
                    </Link>
                    <Link href="/companies" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('companies')}
                    </Link>
                    <Link href="/talent" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('talent')}
                    </Link>
                  </div>
                </div>

                <div className="px-4 py-2 border-b border-blue-700 mb-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    {t('resources')}
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <Link href="/career-advice" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('careerAdvice')}
                    </Link>
                    <Link href="/map" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('map')}
                    </Link>
                    {isAdmin && (
                      <Link href="/maintenance-log" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                        {t('maintenanceLog')}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="px-4 py-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    {t('company')}
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <Link href="/about" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('about')}
                    </Link>
                    <Link href="/contact" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('contact')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      {user && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end py-2">
              <span className="text-sm text-gray-700">{tCommon('welcome', { name: user.name })}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
