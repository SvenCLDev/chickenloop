'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-4 sm:mb-0">
            <p className="text-sm text-gray-300">
              {t('copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
          <div className="flex items-center space-x-6 flex-wrap justify-center sm:justify-start">
            <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
              {t('about')}
            </Link>
            <Link href="/contact" className="text-sm text-gray-300 hover:text-white transition-colors">
              {t('contact')}
            </Link>
            <Link href="/terms" className="text-sm text-gray-300 hover:text-white transition-colors">
              {t('terms')}
            </Link>
            <Link href="/privacy" className="text-sm text-gray-300 hover:text-white transition-colors">
              {t('privacy')}
            </Link>
            <Link href="/cookie-settings" className="text-sm text-gray-300 hover:text-white transition-colors">
              {t('cookieSettings')}
            </Link>
            <Link href="/affiliate-disclosure" className="text-sm text-gray-300 hover:text-white transition-colors">
              {t('affiliateDisclosure')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
