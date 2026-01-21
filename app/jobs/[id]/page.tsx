import { notFound, permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';
import { generateJobUrlPath } from '@/lib/jobSlug';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

interface JobForRedirect {
  title: string;
  country?: string | null;
}

async function getJob(id: string): Promise<JobForRedirect | null> {
  try {
    await connectDB();
    
    const job = await Job.findById(id).select('title country published').lean();
    
    if (!job) {
      return null;
    }

    // Check if job is published (unpublished jobs are hidden from public)
    if (job.published === false) {
      return null;
    }

    // Increment visit count atomically (we don't need to wait for this)
    Job.findByIdAndUpdate(id, { $inc: { visitCount: 1 } }).catch(err => {
      console.error('Error incrementing visit count:', err);
    });
    
    // Normalize country field
    const countryValue = job.country != null && typeof job.country === 'string'
      ? (job.country.trim() ? job.country.trim().toUpperCase() : null)
      : job.country;
    
    return {
      title: job.title,
      country: countryValue,
    };
  } catch (error) {
    console.error('Error fetching job:', error);
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  // Generate canonical URL path
  const canonicalPath = generateJobUrlPath(job.title, job.country);
  
  // Get query parameters from request headers if available
  const headersList = await headers();
  // Try to get query string from various header sources
  const referer = headersList.get('referer') || '';
  const xUrl = headersList.get('x-url') || '';
  const xOriginalUrl = headersList.get('x-original-url') || '';
  
  // Extract query string from any available source
  let searchParams = '';
  const urlSources = [referer, xUrl, xOriginalUrl].filter(Boolean);
  for (const urlSource of urlSources) {
    try {
      const url = new URL(urlSource);
      if (url.search) {
        searchParams = url.search;
        break;
      }
    } catch {
      // Invalid URL, continue to next source
      continue;
    }
  }
  
  // Redirect to canonical URL with query params preserved if available
  const redirectUrl = searchParams ? `${canonicalPath}${searchParams}` : canonicalPath;
  permanentRedirect(redirectUrl); // 308 Permanent Redirect (SEO-safe)
}
