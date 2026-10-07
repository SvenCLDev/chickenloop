'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

const LABELS: Record<AppLocale, string> = {
  en: 'EN',
  de: 'DE',
  es: 'ES',
};

export default function LocaleSwitcher({
  className = '',
}: {
  className?: string;
}) {
  const t = useTranslations('Common');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <span className="sr-only">{t('language')}</span>
      <select
        aria-label={t('language')}
        value={locale}
        onChange={(e) => {
          router.replace(pathname, { locale: e.target.value as AppLocale });
        }}
        className="rounded bg-blue-700/80 text-white border border-blue-400/40 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="text-gray-900">
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
