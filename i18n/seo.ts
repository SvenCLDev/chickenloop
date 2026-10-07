import { getPathname } from './navigation';
import { locales, type AppLocale } from './routing';
import { getSiteUrl } from '@/lib/siteUrl';

export type { AppLocale };

/** Absolute URL for a localized pathname (href without locale prefix). */
export function localizedAbsoluteUrl(
  locale: AppLocale,
  href: '/' | `/${string}` = '/'
): string {
  const path = getPathname({ locale, href });
  return `${getSiteUrl()}${path}`;
}

/** Next.js metadata.alternates.languages + canonical for hreflang. */
export function localeAlternates(
  locale: AppLocale,
  href: '/' | `/${string}` = '/'
) {
  const languages = Object.fromEntries(
    locales.map((l) => [l, localizedAbsoluteUrl(l, href)])
  ) as Record<AppLocale, string>;

  return {
    canonical: localizedAbsoluteUrl(locale, href),
    languages: {
      ...languages,
      'x-default': localizedAbsoluteUrl('en', href),
    },
  };
}

export const ogLocaleByAppLocale: Record<AppLocale, string> = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
};
