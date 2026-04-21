'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import JobCard from '../components/JobCard';
import type { JobListItem } from '@/lib/jobs';

interface JobListProps {
  initialJobs: JobListItem[];
  initialPage: number;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

export default function JobList({ initialJobs, initialPage, hasMore }: JobListProps) {
  const [jobs, setJobs] = useState<JobListItem[]>(initialJobs);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMoreState, setHasMoreState] = useState(hasMore);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const loadedPagesRef = useRef<Set<number>>(new Set([initialPage]));
  const router = useRouter();

  const loadMore = useCallback(async () => {
    if (loading || !hasMoreState) return;

    const nextPage = page + 1;
    if (loadedPagesRef.current.has(nextPage)) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/jobs?page=${nextPage}&limit=${PAGE_SIZE}`);
      if (!res.ok) {
        setHasMoreState(false);
        return;
      }

      const data = await res.json();
      const nextJobs: JobListItem[] = Array.isArray(data.jobs) ? data.jobs : [];

      loadedPagesRef.current.add(nextPage);

      if (nextJobs.length === 0) {
        setHasMoreState(false);
        return;
      }

      setJobs((prev) => {
        // Keep featured jobs on every page batch, but dedupe standard jobs by id.
        const seenStandard = new Set(
          prev.filter((job) => !job.featured).map((job) => job._id)
        );
        const deduped = nextJobs.filter((job) => job.featured || !seenStandard.has(job._id));
        return [...prev, ...deduped];
      });
      setPage(nextPage);

      if (data.hasMore === false || nextJobs.length < PAGE_SIZE) {
        setHasMoreState(false);
      }

      router.push(`/jobs?page=${nextPage}`, { scroll: false });
    } catch {
      setHasMoreState(false);
    } finally {
      setLoading(false);
    }
  }, [hasMoreState, loading, page, router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    const sentinel = observerRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const renderedJobs = useMemo(() => jobs, [jobs]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {renderedJobs.map((job, index) => (
          <JobCard key={`${job._id}-${index}`} job={job} priority={index < 3} />
        ))}
      </div>

      <div ref={observerRef} className="h-10" />

      {loading && <p className="text-center text-gray-600 py-4">Loading more jobs...</p>}
      {!hasMoreState && jobs.length > 0 && (
        <p className="text-center text-gray-500 py-4">You have reached the end.</p>
      )}
    </>
  );
}
