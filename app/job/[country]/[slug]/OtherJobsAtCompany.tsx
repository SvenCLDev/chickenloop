'use client';

import { useEffect, useState, useCallback } from 'react';
import JobCard from '@/app/components/JobCard';
import CareerAdviceCard from '@/app/components/CareerAdviceCard';
import { jobsApi } from '@/lib/api';

/** Shape for job cards (matches JobCard props) */
interface OtherJobForCard {
  _id: string;
  title: string;
  company: string;
  city: string;
  country?: string | null;
  pictures?: string[];
  featured?: boolean;
}

/** Shape for career advice cards (matches CareerAdviceCard props) */
interface CareerAdviceForCard {
  id: string;
  title: string;
  picture?: string;
  createdAt: string;
}

interface OtherJobsAtCompanyProps {
  otherJobs: OtherJobForCard[];
  companyName: string;
  user: { userId: string; role: string } | null;
  fillWithCareerAdvice?: CareerAdviceForCard[];
}

export default function OtherJobsAtCompany({
  otherJobs,
  companyName,
  user,
  fillWithCareerAdvice = [],
}: OtherJobsAtCompanyProps) {
  const [favouriteJobIds, setFavouriteJobIds] = useState<Set<string>>(new Set());
  const [togglingFavouriteId, setTogglingFavouriteId] = useState<string | null>(null);

  const loadFavourites = useCallback(async () => {
    if (user?.role !== 'job-seeker') return;
    try {
      const data = await jobsApi.getFavourites();
      const ids = (data.jobs ?? []).map((j: { _id: string }) => j._id);
      setFavouriteJobIds(new Set(ids));
    } catch {
      setFavouriteJobIds(new Set());
    }
  }, [user?.role]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const handleHeartClick = useCallback(
    async (e: React.MouseEvent, jobId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (user?.role !== 'job-seeker') return;
      setTogglingFavouriteId(jobId);
      try {
        await jobsApi.toggleFavourite(jobId);
        await loadFavourites();
      } catch {
        // ignore
      } finally {
        setTogglingFavouriteId(null);
      }
    },
    [user?.role, loadFavourites]
  );

  const handleLoginPrompt = useCallback(() => {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }, []);

  if (otherJobs.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Other jobs at {companyName}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {otherJobs.map((job, index) => (
          <JobCard
            key={job._id}
            job={job}
            priority={index === 0}
            user={user ? { role: user.role } : null}
            isFavourite={favouriteJobIds.has(job._id)}
            togglingFavourite={togglingFavouriteId === job._id}
            onHeartClick={handleHeartClick}
            onLoginPrompt={handleLoginPrompt}
          />
        ))}
        {fillWithCareerAdvice.map((article) => (
          <CareerAdviceCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
