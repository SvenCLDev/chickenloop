'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { trackTalentNetworkPromo } from '@/lib/talentNetworkPromoAnalytics';
import { shouldShowTalentNetworkPromo } from '@/lib/talentNetworkPromoVisibility';

const ANALYTICS_SOURCE = 'job_detail';

const BENEFITS = [
  'Get discovered by schools searching for instructors and watersports professionals.',
  'Showcase your experience, sports, qualifications and languages.',
  'Tell employers when and where you are available to work.',
] as const;

type TalentNetworkJobDetailPromoProps = {
  jobId: string;
  className?: string;
};

export default function TalentNetworkJobDetailPromo({
  jobId,
  className = '',
}: TalentNetworkJobDetailPromoProps) {
  const { user, loading: authLoading } = useAuth();
  const [cvCount, setCvCount] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'job-seeker') {
      setCvCount(null);
      return;
    }
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/profile/mine/count', { credentials: 'include' });
        const data = await res.json();
        if (!cancelled && res.ok && typeof data.count === 'number') {
          setCvCount(data.count);
        } else if (!cancelled) {
          setCvCount(null);
        }
      } catch {
        if (!cancelled) setCvCount(null);
      }
    };
    void fetchCount();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.role, user?.id]);

  const eligible = shouldShowTalentNetworkPromo({
    role: user?.role ?? null,
    authLoading,
    cvCount: user?.role === 'job-seeker' ? cvCount : null,
  });

  const isRegisteredNoProfile = user?.role === 'job-seeker' && cvCount === 0;
  const userType = isRegisteredNoProfile ? 'registered_no_profile' : 'anonymous';
  const analyticsMeta = useMemo(
    () => ({
      placement: 'job_detail',
      user_type: userType,
      job_id: jobId,
    }),
    [jobId, userType]
  );

  const copy = isRegisteredNoProfile
    ? {
        headline: 'Your next watersports job could find you.',
        body: 'Complete your free professional profile to become discoverable by schools looking for instructors and other watersports professionals.',
        ctaLabel: 'Complete my profile',
        ctaHref: '/job-seeker/profile/new',
      }
    : {
        headline: 'Want more opportunities in watersports?',
        body: "Don't just apply for jobs. Let watersports schools find you, too.\n\nCreate your free Chickenloop profile and become discoverable by employers looking for watersports professionals.",
        ctaLabel: 'Create your free professional profile',
        ctaHref: '/register',
      };

  useEffect(() => {
    if (!eligible) return;
    const el = rootRef.current;
    if (!el) return;

    const storageKey = `talent_network_promo_view_${ANALYTICS_SOURCE}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        trackTalentNetworkPromo(
          'talent_network_promo_view',
          ANALYTICS_SOURCE,
          analyticsMeta
        );
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(storageKey, '1');
        }
        observer.disconnect();
      },
      { threshold: 0.5, rootMargin: '0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eligible, analyticsMeta]);

  if (!eligible) return null;

  const handleCtaClick = () => {
    trackTalentNetworkPromo('talent_network_promo_click', ANALYTICS_SOURCE, analyticsMeta);
  };

  return (
    <section
      ref={rootRef}
      className={`mb-6 rounded-xl border-2 border-cyan-300 bg-gradient-to-br from-blue-100/80 via-cyan-50 to-blue-50 px-5 py-7 sm:px-8 sm:py-8 shadow-sm ${className}`}
      aria-labelledby="talent-network-job-detail-heading"
    >
      <p className="text-xs font-semibold tracking-wider uppercase text-cyan-800">
        Free professional profile
      </p>
      <h2
        id="talent-network-job-detail-heading"
        className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900"
      >
        {copy.headline}
      </h2>
      <div className="mt-3 space-y-2 text-sm sm:text-base text-gray-700 max-w-2xl whitespace-pre-line">
        {copy.body}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-gray-700 max-w-2xl">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-700"
              aria-hidden
            />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          href={copy.ctaHref}
          onClick={handleCtaClick}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
        >
          {copy.ctaLabel}
        </Link>
      </div>
    </section>
  );
}
