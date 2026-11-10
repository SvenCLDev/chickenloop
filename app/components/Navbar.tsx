'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '../contexts/AuthContext';
import LocaleSwitcher from './LocaleSwitcher';

/** Browse + account text links — one shared style */
const navLinkClass =
  'px-2 py-2 rounded text-sm font-medium text-white hover:bg-blue-700 transition-colors';

/** Primary conversion CTA (Post Job) */
const ctaPrimaryClass =
  'inline-flex items-center justify-center px-3 py-2 rounded-md bg-white text-blue-600 text-sm font-semibold shadow-sm hover:bg-blue-50 transition-colors';

/** Secondary conversion CTA (Post Resume) — outline twin of primary */
const ctaOutlineClass =
  'inline-flex items-center justify-center px-3 py-2 rounded-md border border-white/80 bg-transparent text-white text-sm font-semibold hover:bg-white/10 transition-colors';

const ctaPrimaryMobileClass =
  'px-4 py-2.5 rounded-md bg-white text-blue-600 font-semibold text-sm text-center hover:bg-blue-50 transition-colors';

const ctaOutlineMobileClass =
  'px-4 py-2.5 rounded-md border border-white/80 bg-transparent text-white font-semibold text-sm text-center hover:bg-white/10 transition-colors';

const accountMobileClass =
  'px-4 py-2.5 rounded-md text-white font-medium text-sm text-center hover:bg-blue-700 transition-colors';

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
  const showPostJob = !(user && isJobSeeker);
  const showPostResume = !(user && isRecruiter);

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
          {/* Desktop: logo | browse | divider | locale + CTAs + account */}
          <div className="hidden xl:flex justify-between items-center h-16 gap-3">
            <div className="flex items-center flex-shrink-0">
              <Link href="/" onClick={handleLogoClick} className="relative block h-16 w-40 overflow-visible">
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

            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <div className="flex shrink-0 items-center gap-1">
                <Link href="/jobs" className={navLinkClass}>
                  {t('jobs')}
                </Link>
                <Link href="/companies" className={navLinkClass}>
                  {t('companies')}
                </Link>
                <Link href="/talent" className={navLinkClass}>
                  {t('talent')}
                </Link>
                <Link href="/career-advice" className={navLinkClass}>
                  {t('guides')}
                </Link>
                <Link href="/map" className={navLinkClass}>
                  {t('map')}
                </Link>
              </div>

              <div className="h-6 w-px shrink-0 bg-white/30" aria-hidden="true" />

              <div className="flex shrink-0 items-center gap-2">
                <LocaleSwitcher />
                {showPostJob && (
                  <Link href="/recruiter/jobs/new" className={ctaPrimaryClass}>
                    {t('postJob')}
                  </Link>
                )}
                {showPostResume && (
                  <Link href="/job-seeker/profile/new" className={ctaOutlineClass}>
                    {t('postResume')}
                  </Link>
                )}
                {user ? (
                  <>
                    <Link href={dashboardHref} className={navLinkClass}>
                      {t('dashboard')}
                    </Link>
                    <button type="button" onClick={handleLogout} className={navLinkClass}>
                      {t('logout')}
                    </button>
                  </>
                ) : (
                  <Link href="/login" className={navLinkClass}>
                    {t('login')}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Mobile / tablet header — below xl */}
          <div className="xl:hidden relative flex justify-between items-center h-16">
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
              {showPostJob && (
                <Link
                  href="/recruiter/jobs/new"
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-white text-blue-600 font-semibold text-xs shadow-sm hover:bg-blue-50 transition-colors"
                  onClick={closeMobileMenu}
                >
                  {t('postJob')}
                </Link>
              )}
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="xl:hidden pb-4 border-t border-blue-700 bg-blue-600">
              <div className="flex flex-col pt-2">
                <div className="px-4 py-2 border-b border-blue-700 mb-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    {t('primaryActions')}
                  </h3>
                  <div className="flex flex-col space-y-2">
                    {showPostJob && (
                      <Link
                        href="/recruiter/jobs/new"
                        onClick={closeMobileMenu}
                        className={ctaPrimaryMobileClass}
                      >
                        {t('postJob')}
                      </Link>
                    )}
                    {showPostResume && (
                      <Link
                        href="/job-seeker/profile/new"
                        onClick={closeMobileMenu}
                        className={ctaOutlineMobileClass}
                      >
                        {t('postResume')}
                      </Link>
                    )}
                    {user ? (
                      <>
                        <Link
                          href={dashboardHref}
                          onClick={closeMobileMenu}
                          className={accountMobileClass}
                        >
                          {t('dashboard')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            closeMobileMenu();
                            handleLogout();
                          }}
                          className={accountMobileClass}
                        >
                          {t('logout')}
                        </button>
                      </>
                    ) : (
                      <Link href="/login" onClick={closeMobileMenu} className={accountMobileClass}>
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
                    <Link
                      href="/companies"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
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
                    <Link
                      href="/career-advice"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      {t('careerAdvice')}
                    </Link>
                    <Link href="/map" onClick={closeMobileMenu} className="px-4 py-2 rounded hover:bg-blue-700 text-sm">
                      {t('map')}
                    </Link>
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
