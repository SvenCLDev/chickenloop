'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function HomepageValueProps() {
  const t = useTranslations('Home');

  const valueProps = [
    {
      title: t('valueProp1Title'),
      description: t('valueProp1Description'),
    },
    {
      title: t('valueProp2Title'),
      description: t('valueProp2Description'),
    },
    {
      title: t('valueProp3Title'),
      description: t('valueProp3Description'),
    },
  ];

  return (
    <section className="bg-gray-50 pt-8 pb-12 sm:pt-10 sm:pb-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
          {t('valuePropsTitle')}
        </h2>
        <p className="text-center text-gray-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="font-semibold text-gray-800">{t('valuePropsLeadStrong')}</span>{' '}
          {t('valuePropsLead')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {valueProps.map((item) => (
            <div key={item.title} className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"
                aria-hidden="true"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 sm:mt-10 text-center">
          <Link
            href="/register"
            className="text-sm sm:text-base font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            {t('createProfileFree')}
          </Link>
        </p>
      </div>
    </section>
  );
}
