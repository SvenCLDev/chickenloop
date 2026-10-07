import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { localeAlternates, type AppLocale } from '@/i18n/seo';
import { routing } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) return {};
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'Register' });
  return {
    title: t('title'),
    alternates: localeAlternates(locale, '/register'),
  };
}

export default function RegisterLayout({ children }: Props) {
  return children;
}
