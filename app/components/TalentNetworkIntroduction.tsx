'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { trackTalentNetworkPromo } from '@/lib/talentNetworkPromoAnalytics';

const ANALYTICS_SOURCE = 'job_listing';

const BENEFITS = [
  'Showcase your watersports experience and qualifications.',
  'Tell schools which sports you teach and where you want to work.',
  'Get discovered by watersports employers looking for professionals like you.',
] as const;

type TalentNetworkIntroductionProps = {
  ctaHref: string;
  className?: string;
};

export default function TalentNetworkIntroduction({
  ctaHref,
  className = '',
}: TalentNetworkIntroductionProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const storageKey = `talent_network_promo_view_${ANALYTICS_SOURCE}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        trackTalentNetworkPromo('talent_network_promo_view', ANALYTICS_SOURCE);
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(storageKey, '1');
        }
        observer.disconnect();
      },
      { threshold: 0.5, rootMargin: '0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleCtaClick = () => {
    trackTalentNetworkPromo('talent_network_promo_click', ANALYTICS_SOURCE);
  };

  return (
    <section
      ref={rootRef}
      className={`rounded-xl border border-cyan-200 bg-gradient-to-br from-blue-50 to-cyan-50 px-5 py-6 sm:px-8 sm:py-7 ${className}`}
      aria-labelledby="talent-network-intro-heading"
    >
      <h2
        id="talent-network-intro-heading"
        className="text-xl sm:text-2xl font-bold text-gray-900"
      >
        Get discovered by watersports schools
      </h2>
      <p className="mt-2 text-sm sm:text-base text-gray-700 max-w-2xl">
        Create your free professional profile on Chickenloop and let schools looking for
        instructors find you.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-gray-700 max-w-2xl">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" aria-hidden />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <Link
          href={ctaHref}
          onClick={handleCtaClick}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
        >
          Create your free profile
        </Link>
      </div>
    </section>
  );
}
