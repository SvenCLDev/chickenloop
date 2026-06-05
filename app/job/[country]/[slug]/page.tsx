import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import type { Metadata } from 'next';
import Navbar from '../../../components/Navbar';
import ShareJobButton from '../../../components/ShareJobButton';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { buildJobJsonLd } from '@/lib/seo/jobJsonLd';
import { getCompanyUrl } from '@/lib/companySlug';
import { generateJobSlug, generateCountrySlug, generateJobUrlPath, getCountryValuesForSlug } from '@/lib/jobSlug';
import { stripHtmlToText } from '@/lib/sanitizeText';
import Link from 'next/link';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import JobImage from '@/models/JobImage';
import CareerAdvice from '@/models/CareerAdvice';
import mongoose from 'mongoose';
import JobFavouriteButton from '../../../jobs/[id]/JobFavouriteButton';
import JobSimilarJobsAlertButton from '../../../jobs/JobSimilarJobsAlertButton';
import JobApplySection from '../../../jobs/[id]/JobApplySection';
import JobSpamButton from '../../../jobs/[id]/JobSpamButton';
import JobThumbnailGallery from '../../../jobs/[id]/JobThumbnailGallery';
import JobHeroImage from '../../../jobs/[id]/JobHeroImage';
import JobOwnerActions from './JobOwnerActions';
import OtherJobsAtCompany from './OtherJobsAtCompany';
import OtherJobsInCountry from './OtherJobsInCountry';
import CareerAdviceSection from './CareerAdviceSection';
import { verifyToken } from '@/lib/jwt';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { getEmploymentTypeLabel } from '@/lib/employmentTypes';
import { getExperienceLevelLabel } from '@/lib/experienceLevels';

// Reuse interfaces from existing job details page
export interface CompanyInfo {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  logo?: string;
  website?: string;
  city?: string;
  country?: string;
  address?: { city?: string; country?: string };
}

function abbreviateBySentence(text: string, maxChars: number): string {
  const clean = text.trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;

  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return clean;

  let out = sentences[0] ?? '';
  for (let i = 1; i < sentences.length; i++) {
    const candidate = `${out} ${sentences[i]}`.trim();
    if (candidate.length > maxChars) break;
    out = candidate;
  }
  return out.trim();
}

interface CompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface Job {
  _id: string;
  title: string;
  description: string;
  company: string;
  city: string;
  country?: string | null;
  salary?: string;
  type: string;
  experienceLevel?: string;
  experience?: string;
  languages?: string[];
  occupationalAreas?: string[];
  sports?: string[];
  qualifications?: string[];
  pictures?: string[];
  recruiter: {
    name: string;
    email: string;
  };
  recruiterId?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  datePosted?: Date | string;
  validThrough?: Date | string;
  companyId?: CompanyInfo;
  spam?: 'yes' | 'no';
  published?: boolean;
  featured?: boolean;
  featuredUntil?: string | null;
  applyViaATS?: boolean;
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
  companyForSummary?: {
    address?: {
      city?: string;
      country?: string;
    };
    offeredActivities?: string[];
    offeredServices?: string[];
  };
  heroImageUrl?: string;
}

function formatCompanyAddress(address?: CompanyAddress): string | null {
  if (!address) return null;
  const parts: string[] = [];
  if (address.street) parts.push(address.street);
  const cityState = [address.city, address.state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) {
    parts.push(getCountryNameFromCode(address.country));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function getUserFromCookies(): Promise<{ userId: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return null;
    }
    const payload = verifyToken(token);
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

/**
 * Resolve job from slug: canonical match first, then legacySlug fallback with redirect.
 * Returns { jobId } | { redirect: path } | null.
 */
type ResolveSlugOptions = { includeUnpublished?: boolean };

async function resolveJobFromSlug(
  slug: string,
  countrySlug: string,
  options?: ResolveSlugOptions
): Promise<{ jobId: string } | { redirect: string } | null> {
  await connectDB();

  // 1. Canonical slug: filter by country, then match title slug
  const countryValues = getCountryValuesForSlug(countrySlug);
  const countryFilter =
    countryValues.length > 0
      ? { country: { $in: countryValues } }
      : { country: { $in: [] } };

  const publishedFilter = options?.includeUnpublished ? {} : { published: { $ne: false } };

  const canonicalCandidates = await Job.find({
    ...publishedFilter,
    ...countryFilter,
  })
    .select('_id title country')
    .lean();

  for (const job of canonicalCandidates) {
    if (
      generateJobSlug(job.title) === slug &&
      generateCountrySlug(job.country) === countrySlug
    ) {
      return { jobId: String(job._id) };
    }
  }

  // 2. Legacy slug fallback: indexed query by legacySlug (no country filter)
  const legacyQuery: Record<string, unknown> = { legacySlug: slug };
  if (!options?.includeUnpublished) {
    legacyQuery.published = { $ne: false };
  }
  const legacyJob = await Job.findOne(legacyQuery)
    .select('_id title country')
    .lean();

  if (legacyJob) {
    const correctCountrySlug = generateCountrySlug(legacyJob.country);
    const correctSlug = generateJobSlug(legacyJob.title);
    return { redirect: `/job/${correctCountrySlug}/${correctSlug}` };
  }

  return null;
}

/**
 * Next.js <Link> prefetch and browser prefetch requests run the RSC tree; they should not bump visit counts.
 */
/**
 * Job documents store URLs in `pictures`; JobImage rows add ordering/hero. Some flows
 * (e.g. admin) only write all URLs to `pictures` but create fewer JobImage docs.
 * Merge both sources so the public page shows every picture without duplicates.
 */
function mergeJobImageSources(
  jobImages: { imageUrl?: string; isHero?: boolean; order?: number }[],
  picturesFromJob: string[] | undefined
): { allImages: string[]; heroImageUrl: string | undefined } {
  const sorted = [...jobImages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const fromDocs = sorted
    .map((img) => img.imageUrl)
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

  const seen = new Set<string>();
  const merged: string[] = [];
  const addUrl = (url: string) => {
    const key = url.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(url);
  };

  for (const u of fromDocs) {
    addUrl(u);
  }
  const fromPictures = Array.isArray(picturesFromJob) ? picturesFromJob : [];
  for (const u of fromPictures) {
    addUrl(u);
  }

  const heroDoc = sorted.find((img) => img.isHero === true && img.imageUrl);
  const heroImageUrl =
    heroDoc?.imageUrl?.trim() || (merged.length > 0 ? merged[0] : undefined);

  return { allImages: merged, heroImageUrl };
}

/** Facebook / OG expect a stable default when a job has no usable image URL. */
const DEFAULT_JOB_OG_IMAGE = 'https://www.chickenloop.com/default-job-image.jpg';

function getSiteOriginForMetadata(headersList: Headers): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }
  const host = headersList.get('host') || 'www.chickenloop.com';
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}

/** Stored URLs may be absolute (Blob) or site-relative (`/uploads/...`). */
function toAbsolutePublicImageUrl(raw: string, siteOrigin: string): string {
  const u = raw.trim();
  if (!u) {
    return DEFAULT_JOB_OG_IMAGE;
  }
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  if (u.startsWith('//')) {
    return `https:${u}`;
  }
  const base = siteOrigin.replace(/\/$/, '');
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
}

async function shouldSkipVisitCountForPrefetch(): Promise<boolean> {
  try {
    const h = await headers();
    // Next.js sets this to "1" or "2" for prefetch / segment prefetch (see fetch-server-response.js)
    const prefetch = h.get('next-router-prefetch') ?? h.get('Next-Router-Prefetch');
    if (prefetch === '1' || prefetch === '2') return true;
    const purpose = h.get('purpose') ?? h.get('sec-purpose') ?? h.get('Sec-Purpose');
    if (purpose?.toLowerCase() === 'prefetch') return true;
    return false;
  } catch {
    return false;
  }
}

type GetJobOptions = { includeUnpublished?: boolean };

/**
 * Get job by ID (reused from existing job details page)
 */
async function getJob(id: string, options?: GetJobOptions): Promise<Job | null> {
  try {
    await connectDB();
    
    const job = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate(
        'companyId',
        'name description logo website address offeredActivities offeredServices'
      );
    
    if (!job) {
      return null;
    }

    // Unpublished jobs are hidden from public; admins may preview when includeUnpublished is set.
    const jobPublished = job.published;
    if (jobPublished === false && !options?.includeUnpublished) {
      return null;
    }

    // Count only real navigations, not RSC/link prefetch (which would inflate "Visits").
    // Do not increment visits for unpublished jobs (e.g. admin preview of draft).
    const skipCount = await shouldSkipVisitCountForPrefetch();
    let docForResponse = job;
    if (!skipCount && jobPublished !== false) {
      await Job.findByIdAndUpdate(
        id,
        { $inc: { visitCount: 1 } },
        { timestamps: false }
      );
      const reloaded = await Job.findById(id)
        .populate('recruiter', 'name email')
        .populate(
          'companyId',
          'name description logo website address offeredActivities offeredServices'
        );
      if (reloaded) {
        docForResponse = reloaded;
      }
    }

    // Convert to plain object
    const jobObject = docForResponse.toObject();
    
    // Normalize country field
    const countryValue = jobObject.country != null && typeof jobObject.country === 'string'
      ? (jobObject.country.trim() ? jobObject.country.trim().toUpperCase() : null)
      : jobObject.country;
    
    // Ensure recruiter is properly typed after populate
    const recruiter = docForResponse.recruiter && typeof docForResponse.recruiter === 'object' && 'name' in docForResponse.recruiter
      ? {
          name: (docForResponse.recruiter as any).name || '',
          email: (docForResponse.recruiter as any).email || '',
        }
      : {
          name: '',
          email: '',
        };
    
    // Extract recruiter ID (ObjectId) for permission checks
    const recruiterId = jobObject.recruiter 
      ? (typeof jobObject.recruiter === 'object' && '_id' in jobObject.recruiter
          ? String((jobObject.recruiter as any)._id)
          : String(jobObject.recruiter))
      : undefined;
    
    // Merge JobImage rows with job.pictures (admin flows often have all URLs on Job, fewer JobImage rows)
    let allImages: string[] = [];
    let heroImageUrl: string | undefined;
    const rawPictures = Array.isArray(jobObject.pictures) ? jobObject.pictures : [];
    try {
      const jobImages = await JobImage.find({
        jobId: new mongoose.Types.ObjectId(id),
      })
        .sort({ order: 1 })
        .lean();

      const merged = mergeJobImageSources(
        (jobImages || []) as { imageUrl?: string; isHero?: boolean; order?: number }[],
        rawPictures
      );
      allImages = merged.allImages;
      heroImageUrl = merged.heroImageUrl;
    } catch (error) {
      console.error('Error fetching images from JobImage collection:', error);
      if (rawPictures.length > 0) {
        allImages = rawPictures;
        heroImageUrl = rawPictures[0];
      }
    }
    
    // Convert ObjectIds to strings for Client Component compatibility
    // Also extract full company data for summary generation
    const companyId = jobObject.companyId;
    let serializedCompanyId: CompanyInfo | undefined;
    let companyForSummary: { address?: { city?: string; country?: string }; offeredActivities?: string[]; offeredServices?: string[] } | undefined;
    
    if (companyId && typeof companyId === 'object' && companyId !== null && '_id' in companyId) {
      // Type guard: ensure it's a populated object, not just an ObjectId
      const populatedCompany = companyId as unknown as Record<string, unknown>;
      
      // Extract address for summary
      const address = populatedCompany.address && typeof populatedCompany.address === 'object'
        ? {
            city: 'city' in populatedCompany.address && typeof populatedCompany.address.city === 'string' 
              ? populatedCompany.address.city 
              : undefined,
            country: 'country' in populatedCompany.address && typeof populatedCompany.address.country === 'string'
              ? populatedCompany.address.country
              : undefined,
          }
        : undefined;
      
      // Extract activities and services for summary
      const offeredActivities = Array.isArray(populatedCompany.offeredActivities)
        ? populatedCompany.offeredActivities.filter((a): a is string => typeof a === 'string')
        : undefined;
      const offeredServices = Array.isArray(populatedCompany.offeredServices)
        ? populatedCompany.offeredServices.filter((s): s is string => typeof s === 'string')
        : undefined;
      
      serializedCompanyId = {
        _id: populatedCompany._id ? String(populatedCompany._id) : undefined,
        id: populatedCompany._id ? String(populatedCompany._id) : undefined,
        name: typeof populatedCompany.name === 'string' ? populatedCompany.name : undefined,
        description:
          typeof populatedCompany.description === 'string'
            ? populatedCompany.description
            : undefined,
        logo: typeof populatedCompany.logo === 'string' ? populatedCompany.logo : undefined,
        website: typeof populatedCompany.website === 'string' ? populatedCompany.website : undefined,
        city: address?.city,
        country: address?.country,
        address, // required for getCompanyUrl(company) so "More Company Details" link gets correct country slug
      };
      
      // Store full company data for summary generation
      companyForSummary = {
        address,
        offeredActivities,
        offeredServices,
      };
    }
    
    return {
      ...jobObject,
      _id: String(jobObject._id), // Convert ObjectId to string
      city: jobObject.city,
      country: countryValue,
      recruiter,
      recruiterId, // Include recruiter ID for permission checks
      companyId: serializedCompanyId,
      company: serializedCompanyId?.name ?? (jobObject.legacy?.originalCompanyText ?? ''), // Display name from populated companyId or legacy migration
      companyForSummary, // Include company data for summary generation
      published: jobObject.published !== undefined ? jobObject.published : true, // Include published status
      heroImageUrl, // Include hero image URL (explicit isHero or first image fallback)
      pictures: allImages.length > 0 ? allImages : jobObject.pictures || [], // merged JobImage + job.pictures
    } as Job;
  } catch (error) {
    console.error('Error fetching job:', error);
    return null;
  }
}

/** Shape for "other jobs" cards: matches JobCard props */
export interface OtherJobForCard {
  _id: string;
  title: string;
  company: string;
  city: string;
  country?: string | null;
  pictures?: string[];
  featured?: boolean;
}

/**
 * Fetch other published jobs at the same company (excluding the current job).
 * Returns jobs in a shape suitable for JobCard.
 */
async function getOtherJobsAtCompany(
  currentJobId: string,
  companyId: string | undefined
): Promise<OtherJobForCard[]> {
  if (!companyId) return [];
  try {
    await connectDB();
    const companyObjId = new mongoose.Types.ObjectId(companyId);
    const others = await Job.find({
      companyId: companyObjId,
      _id: { $ne: new mongoose.Types.ObjectId(currentJobId) },
      published: { $ne: false },
    })
      .select('_id title city country pictures featured')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    return others.map((j: any) => ({
      _id: String(j._id),
      title: j.title ?? '',
      company: (j.companyId && typeof j.companyId === 'object' && j.companyId.name) ? j.companyId.name : '',
      city: j.city ?? '',
      country: j.country ?? null,
      pictures: Array.isArray(j.pictures) ? j.pictures : [],
      featured: j.featured ?? false,
    }));
  } catch (err) {
    console.error('getOtherJobsAtCompany:', err);
    return [];
  }
}

/** Shape for career advice card (matches CareerAdviceCard props) */
export interface CareerAdviceForCard {
  id: string;
  title: string;
  picture?: string;
  createdAt: string;
}

/**
 * Fetch published career advice articles for filling "Other jobs at company" section.
 * Returns up to `limit` most recent articles.
 */
async function getCareerAdviceForFill(limit: number): Promise<CareerAdviceForCard[]> {
  if (limit <= 0) return [];
  try {
    await connectDB();
    const articles = await CareerAdvice.find({ published: { $ne: false } })
      .select('_id title picture createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return articles.map((a: any) => ({
      id: String(a._id),
      title: a.title ?? '',
      picture: a.picture,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
    }));
  } catch (err) {
    console.error('getCareerAdviceForFill:', err);
    return [];
  }
}

/**
 * Fetch other published jobs in the same country (excluding the current job).
 * Returns up to 3 most recent jobs in a shape suitable for JobCard.
 */
async function getOtherJobsInCountry(
  currentJobId: string,
  country: string | null | undefined
): Promise<OtherJobForCard[]> {
  if (!country || typeof country !== 'string' || !country.trim()) return [];
  try {
    await connectDB();
    const normalizedCountry = country.trim().toUpperCase();
    const others = await Job.find({
      country: normalizedCountry,
      _id: { $ne: new mongoose.Types.ObjectId(currentJobId) },
      published: { $ne: false },
    })
      .select('_id title city country pictures featured')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    return others.map((j: any) => ({
      _id: String(j._id),
      title: j.title ?? '',
      company: (j.companyId && typeof j.companyId === 'object' && j.companyId.name) ? j.companyId.name : '',
      city: j.city ?? '',
      country: j.country ?? null,
      pictures: Array.isArray(j.pictures) ? j.pictures : [],
      featured: j.featured ?? false,
    }));
  } catch (err) {
    console.error('getOtherJobsInCountry:', err);
    return [];
  }
}

interface PageProps {
  params: Promise<{ country: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: countrySlug, slug } = await params;

  const viewer = await getUserFromCookies();
  const adminPreview = viewer?.role === 'admin';

  const result = await resolveJobFromSlug(slug, countrySlug, {
    includeUnpublished: adminPreview,
  });
  if (!result) {
    return {};
  }
  if ('redirect' in result) {
    permanentRedirect(result.redirect);
  }
  const jobId = result.jobId;

  try {
    await connectDB();
    const headersList = await headers();
    const siteOrigin = getSiteOriginForMetadata(headersList);

    const [job, jobImages] = await Promise.all([
      Job.findById(jobId)
        .select('title description city country published pictures type companyId')
        .populate('companyId', 'name')
        .lean(),
      JobImage.find({ jobId: new mongoose.Types.ObjectId(jobId) })
        .sort({ order: 1 })
        .lean(),
    ]);

    if (!job) {
      return {};
    }

    const isUnpublished = (job as { published?: boolean }).published === false;
    const robots =
      isUnpublished && adminPreview
        ? { index: false as const, follow: false as const }
        : undefined;

    const companyName =
      job.companyId && typeof job.companyId === 'object' && 'name' in job.companyId
        ? String((job.companyId as { name?: string }).name ?? '')
        : '';

    const canonicalPath = generateJobUrlPath(job.title, job.country);
    const canonicalUrl = `${siteOrigin.replace(/\/$/, '')}${canonicalPath}`;

    const rawPictures = Array.isArray((job as { pictures?: string[] }).pictures)
      ? (job as { pictures: string[] }).pictures
      : [];
    const { heroImageUrl } = mergeJobImageSources(
      (jobImages || []) as { imageUrl?: string; isHero?: boolean; order?: number }[],
      rawPictures
    );
    const ogImageUrl = heroImageUrl?.trim()
      ? toAbsolutePublicImageUrl(heroImageUrl, siteOrigin)
      : DEFAULT_JOB_OG_IMAGE;

    const descriptionHtml =
      typeof (job as { description?: string }).description === 'string'
        ? (job as { description: string }).description
        : '';
    const plainDesc = stripHtmlToText(descriptionHtml).trim();
    const typeVal = typeof (job as { type?: string }).type === 'string' ? (job as { type: string }).type : 'other';
    const cityVal = typeof (job as { city?: string }).city === 'string' ? (job as { city: string }).city : '';
    const description =
      plainDesc.length > 0
        ? plainDesc.length <= 160
          ? plainDesc
          : `${plainDesc.slice(0, 157)}...`
        : `${getEmploymentTypeLabel(typeVal)} position at ${companyName} in ${cityVal}`
            .replace(/\s+in\s+$/i, '')
            .trim()
            .slice(0, 160);

    const pageTitle = `${job.title} | Chickenloop Watersports Jobs`;

    return {
      title: pageTitle,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      ...(robots && { robots }),
      openGraph: {
        title: job.title,
        description,
        url: canonicalUrl,
        type: 'article',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: job.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: job.title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return {};
  }
}

export default async function CanonicalJobDetailPage({ params }: PageProps) {
  const { country: countrySlug, slug } = await params;

  const user = await getUserFromCookies();
  const adminPreview = user?.role === 'admin';

  const result = await resolveJobFromSlug(slug, countrySlug, {
    includeUnpublished: adminPreview,
  });
  if (!result) {
    notFound();
  }
  if ('redirect' in result) {
    permanentRedirect(result.redirect);
  }
  const jobId = result.jobId;
  
  // Get the job data
  const job = await getJob(jobId, { includeUnpublished: adminPreview });
  
  if (!job) {
    notFound();
  }
  
  // Verify the slug matches the canonical slug (redirect if not)
  const canonicalJobSlug = generateJobSlug(job.title);
  const canonicalCountrySlug = generateCountrySlug(job.country);
  const canonicalPath = generateJobUrlPath(job.title, job.country);
  
  // If the slug or country doesn't match, redirect to canonical URL
  if (slug !== canonicalJobSlug || countrySlug !== canonicalCountrySlug) {
    permanentRedirect(canonicalPath); // 308 Permanent Redirect (SEO-safe)
  }
  
  const isRecruiterView = user?.role === 'recruiter';
  
  // Job owner: recruiter who owns this job (for Job actions box)
  const isJobOwner = user?.role === 'recruiter' && job.recruiterId && user.userId === job.recruiterId;

  // Featured state: for Job actions (only shown to job owner)
  const isFeatured = !!(job.featuredUntil && new Date(job.featuredUntil) >= new Date());

  // Generate current URL for JSON-LD (server-side)
  const headersList = await headers();
  const host = headersList.get('host') || 'chickenloop.vercel.app';
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  const currentUrl = `${protocol}://${host}${canonicalPath}`;

  // Generate JSON-LD for Google Jobs
  // Convert null country to undefined for buildJobJsonLd
  const jobForJsonLd = {
    ...job,
    country: job.country ?? undefined,
  };
  const jsonLd =
    job.published !== false ? buildJobJsonLd(jobForJsonLd, currentUrl) : null;

  const companyDescriptionText = stripHtmlToText(job.companyId?.description);
  const companyDescriptionShort = companyDescriptionText
    ? abbreviateBySentence(companyDescriptionText, 320)
    : '';

  // Other jobs at same company (for section below main card); skip section if none
  const companyIdStr = job.companyId?.id ?? job.companyId?._id;
  const otherJobs = await getOtherJobsAtCompany(job._id, companyIdStr);
  const careerAdviceFill =
    otherJobs.length >= 1 && otherJobs.length <= 2
      ? await getCareerAdviceForFill(3 - otherJobs.length)
      : [];

  // Other jobs in same country (limit 3, most recent)
  const otherJobsInCountry = await getOtherJobsInCountry(job._id, job.country);
  const countryDisplayName = job.country ? getCountryNameFromCode(job.country) || job.country : 'this country';

  // When "Other jobs at [company]" is skipped, show Career Advice section (3 most recent) below "Other jobs in [country]"
  const careerAdviceSection =
    otherJobs.length === 0 ? await getCareerAdviceForFill(3) : [];

  const showDraftBanner = adminPreview && job.published === false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        {/* Google Jobs JSON-LD — omit for unpublished jobs (admin preview) */}
        {jsonLd && job.published !== false && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
        <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/jobs"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 font-semibold"
        >
          ← Back to Jobs
        </Link>

        {showDraftBanner && (
          <div
            className="mb-4 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm"
            role="status"
          >
            This job is <strong>not published</strong>. Only you (admin) can view this page.
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="mb-6 p-3 border border-gray-300 rounded-md bg-gray-50 text-sm">
            <Link
              href={`/admin/repair-job/${job._id}`}
              className="inline-block px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 hover:bg-gray-100 font-medium"
            >
              Repair Relationships
            </Link>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Hero Image - Main featured image at the top */}
          {job.heroImageUrl && (
            <JobHeroImage imageUrl={job.heroImageUrl} jobTitle={job.title} />
          )}

          <div className="p-8">
            {/* Job Title and Company */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <p className="text-2xl text-gray-600 mb-2">{job.company}</p>
              {/* Share, favourites, and job alert actions */}
              <div className="flex flex-wrap items-center gap-3 mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <ShareJobButton
                  jobTitle={job.title}
                  shortDescription={`${getEmploymentTypeLabel(job.type)} position at ${job.company} in ${job.city}`}
                  url={currentUrl}
                />
                <JobFavouriteButton jobId={job._id} />
                <JobSimilarJobsAlertButton
                  category={job.occupationalAreas?.[0]}
                  activity={job.sports?.[0]}
                  country={
                    job.country && typeof job.country === 'string' && job.country.trim()
                      ? job.country.trim().toUpperCase()
                      : undefined
                  }
                  language={job.languages?.[0]}
                  categoryLabel={
                    job.occupationalAreas?.[0]
                      ? JOB_CATEGORIES.find((c) => c.value === job.occupationalAreas![0])?.label
                      : undefined
                  }
                  countryLabel={
                    job.country && typeof job.country === 'string' && job.country.trim()
                      ? getCountryNameFromCode(job.country.trim().toUpperCase())
                      : undefined
                  }
                />
              </div>
              {/* Job actions: Feature / Extend — only for recruiter who owns this job */}
              {isJobOwner && (
                <JobOwnerActions
                  jobId={job._id}
                  featuredUntil={job.featuredUntil ?? null}
                  isFeatured={isFeatured}
                />
              )}
            </div>

            {/* Job Details */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📍</span>
                  <span>{job.city}</span>
                </div>
                {job.country && typeof job.country === 'string' && job.country.trim() && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🌍</span>
                    <span>{getCountryNameFromCode(job.country)}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">💼</span>
                  <span>{getEmploymentTypeLabel(job.type)}</span>
                </div>
                {job.salary && (
                  <div className="flex items-center text-gray-700 font-semibold">
                    <span className="mr-2">💰</span>
                    <span>{job.salary}</span>
                  </div>
                )}
              </div>
              
              {/* Experience Level */}
              {((job as any).experienceLevel || (job as any).experience) && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📊</span>
                    <span className="font-medium">Experience Level:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium"
                    >
                      {getExperienceLevelLabel(
                        ((job as any).experienceLevel || (job as any).experience) ?? ''
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Languages Required */}
              {job.languages && job.languages.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🌐</span>
                    <span className="font-medium">Languages:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.languages.map((language, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Job Categories */}
              {job.occupationalAreas && job.occupationalAreas.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">💼</span>
                    <span className="font-medium">Job Category:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.occupationalAreas.map((value, index) => {
                      const label = JOB_CATEGORIES.find((c) => c.value === value)?.label ?? value;
                      return (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activities */}
              {job.sports && job.sports.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🏄</span>
                    <span className="font-medium">Activities:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.sports.map((activity, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium capitalize"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Required Qualifications */}
              {job.qualifications && job.qualifications.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📜</span>
                    <span className="font-medium">Qualifications:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.qualifications.map((qualification, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {qualification}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
              <div
                className="prose prose-p:text-gray-700 prose-li:text-gray-700 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6 prose-li:my-1 max-w-none leading-relaxed"
                // Description HTML is sanitized on the backend using sanitize-html
                dangerouslySetInnerHTML={{ __html: job.description || '' }}
              />
            </div>

            {job.companyId && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Company Info</h2>
                
                {companyDescriptionShort && (
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {companyDescriptionShort}
                  </p>
                )}
                
                {job.companyId && (job.companyId.name || job.companyId.id || job.companyId._id) && (
                  <div className="mt-4 text-right">
                    <Link
                      href={getCompanyUrl({
                        name: (job.companyId as { name?: string }).name ?? 'Company',
                        address: (job.companyId as { address?: { country?: string } }).address,
                      })}
                      className="inline-block px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                    >
                      More Company Details
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* How to Apply Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">How to Apply</h2>
              
              <JobApplySection
                jobId={job._id}
                companyName={job.company}
                jobPublished={job.published !== false}
                applyViaATS={job.applyViaATS}
                applyByEmail={job.applyByEmail}
                applyByWebsite={job.applyByWebsite}
                applyByWhatsApp={job.applyByWhatsApp}
                applicationEmail={job.applicationEmail}
                applicationWebsite={job.applicationWebsite}
                applicationWhatsApp={job.applicationWhatsApp}
                isRecruiterView={isRecruiterView}
              />

              <p className="mt-4 text-sm text-gray-500 italic">
                Please mention that you found this job on chickenloop.com
              </p>
            </div>

            {/* Job Pictures Gallery - All images (up to 3, including the hero) */}
            {job.pictures && job.pictures.length > 0 && (
              <div className="mb-6">
                <JobThumbnailGallery 
                  pictures={job.pictures.slice(0, 3)} 
                  jobTitle={job.title}
                  allPictures={job.pictures}
                />
              </div>
            )}

            {/* Posted Info and Report Spam */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left Column - Posted Info */}
                <div className="flex-1">
                  <p className="text-sm text-gray-500">
                    Posted by: <span className="font-semibold">{job.recruiter.name}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Posted: {formatDate(job.datePosted || job.createdAt)}
                  </p>
                </div>
                
                {/* Right Column - Report Spam */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <JobSpamButton jobId={job._id} spamStatus={job.spam} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other jobs at the same company (hidden if none); filled with career advice when 1–2 jobs */}
        <OtherJobsAtCompany
          otherJobs={otherJobs}
          companyName={job.company || 'this company'}
          user={user}
          fillWithCareerAdvice={careerAdviceFill}
        />

        {/* Other jobs in the same country */}
        <OtherJobsInCountry
          otherJobs={otherJobsInCountry}
          countryName={countryDisplayName}
          user={user}
        />

        {/* Career Advice (only when "Other jobs at [company]" was skipped) */}
        <CareerAdviceSection articles={careerAdviceSection} />
      </main>
    </div>
  );
}
