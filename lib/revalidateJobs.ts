import { revalidatePath } from 'next/cache';
import { generateJobUrlPath } from '@/lib/jobSlug';

export type JobPageRevalidateTarget = {
  title: string;
  country?: string | null;
  _id?: string | { toString(): string } | null | unknown;
  id?: string | { toString(): string } | null | unknown;
};

function jobDetailPath(job: JobPageRevalidateTarget): string {
  const jobId = job._id ?? job.id;
  if (jobId == null || jobId === '') {
    throw new Error('Job id is required to revalidate a job detail path');
  }
  return generateJobUrlPath(job.title, job.country, jobId);
}

/**
 * Invalidate ISR caches for job listing pages and optional job detail page(s).
 * Safe to call after successful DB writes; logs and swallows revalidation errors.
 */
export function revalidateJobPages(
  job?: JobPageRevalidateTarget,
  previousJob?: JobPageRevalidateTarget
): void {
  try {
    revalidatePath('/');
    revalidatePath('/jobs');

    if (job) {
      revalidatePath(jobDetailPath(job));
    }

    if (previousJob) {
      const previousPath = jobDetailPath(previousJob);
      const currentPath = job ? jobDetailPath(job) : undefined;
      if (!currentPath || previousPath !== currentPath) {
        revalidatePath(previousPath);
      }
    }
  } catch (error) {
    console.error('[revalidateJobPages] Failed to revalidate job pages:', error);
  }
}
