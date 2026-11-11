import Image from 'next/image';
import { getImageProps } from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import HomepageHeroRotationDeferred from './HomepageHeroRotationDeferred';
import {
  HOMEPAGE_HERO_BLUR_DATA_URL,
  HOMEPAGE_HERO_LCP_ELEMENT_ID,
  HOMEPAGE_HERO_LCP_HEIGHT,
  HOMEPAGE_HERO_LCP_IMAGE,
  HOMEPAGE_HERO_LCP_WIDTH,
} from '@/lib/homepageHero';

const ctaBaseClass =
  'inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg shadow-lg transition-all duration-200';

export default function HomepageHero() {
  const t = useTranslations('Home');

  return (
    <section className="relative min-h-[max(400px,60vh)] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <div
          id={HOMEPAGE_HERO_LCP_ELEMENT_ID}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-100"
        >
          <Image
            src={HOMEPAGE_HERO_LCP_IMAGE}
            alt={t('heroImageAlt')}
            fill
            priority
            fetchPriority="high"
            quality={60}
            placeholder="blur"
            blurDataURL={HOMEPAGE_HERO_BLUR_DATA_URL}
            sizes={HOMEPAGE_HERO_LCP_SIZES}
            className="object-cover"
          />
        </div>
        <HomepageHeroRotationDeferred />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-cyan-900/60 to-teal-900/70" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
        <p className="inline-block px-3 py-1 rounded-full bg-white/15 text-white/95 text-sm font-medium mb-3 sm:mb-4 drop-shadow-md">
          {t('badge')}
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-3 sm:mb-5 drop-shadow-lg">
          <span className="block">{t('titleLine1')}</span>
          <span className="block">{t('titleLine2')}</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-2 sm:mb-3 drop-shadow-md max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
        <p className="text-sm sm:text-base md:text-lg text-white/80 mb-6 sm:mb-8 drop-shadow-md">
          {t('sportsLine')}
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center">
          <Link
            href="/jobs"
            className={`${ctaBaseClass} border-2 border-white text-white hover:bg-white/10 hover:shadow-xl`}
          >
            {t('browseJobs')}
          </Link>
          <Link
            href="/talent"
            className={`${ctaBaseClass} border-2 border-white text-white hover:bg-white/10 hover:shadow-xl`}
          >
            {t('exploreTalent')}
          </Link>
          <Link
            href="/register"
            className={`${ctaBaseClass} border-2 border-white text-white hover:bg-white/10 hover:shadow-xl`}
          >
            {t('listProfileFree')}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Shared LCP hero image sizing — keep in sync with the `<Image>` above. */
export const HOMEPAGE_HERO_LCP_SIZES = '(max-width: 768px) 100vw, 1600px';

/** Preload props matching the LCP hero `<Image>` (used in app/[locale]/page.tsx). */
export function getHomepageHeroLcpPreloadProps() {
  return getImageProps({
    src: HOMEPAGE_HERO_LCP_IMAGE,
    alt: '',
    width: HOMEPAGE_HERO_LCP_WIDTH,
    height: HOMEPAGE_HERO_LCP_HEIGHT,
    quality: 60,
    sizes: HOMEPAGE_HERO_LCP_SIZES,
    priority: true,
  }).props;
}
