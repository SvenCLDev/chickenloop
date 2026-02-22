import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import type { Metadata } from 'next';
import Navbar from '../../../components/Navbar';
import ShareJobButton from '../../../components/ShareJobButton';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { buildJobJsonLd } from '@/lib/seo/jobJsonLd';
import { generateCompanySummary } from '@/lib/companySummary';
import { getCompanyUrl } from '@/lib/companySlug';
import { generateJobSlug, generateCountrySlug, generateJobUrlPath, getCountryValuesForSlug } from '@/lib/jobSlug';
import Link from 'next/link';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import JobImage from '@/models/JobImage';
import mongoose from 'mongoose';
import JobFavouriteButton from '../../../jobs/[id]/JobFavouriteButton';
import JobApplySection from '../../../jobs/[id]/JobApplySection';
import JobSpamButton from '../../../jobs/[id]/JobSpamButton';
import JobThumbnailGallery from '../../../jobs/[id]/JobThumbnailGallery';
import JobHeroImage from '../../../jobs/[id]/JobHeroImage';
import JobOwnerActions from './JobOwnerActions';
import { verifyToken } from '@/lib/jwt';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { getEmploymentTypeLabel } from '@/lib/employmentTypes';
import { getExperienceLevelLabel } from '@/lib/experienceLevels';

// Reuse interfaces from existing job details page
export interface CompanyInfo {
  _id?: string;
  id?: string;
  name?: string;
  logo?: string;
  city?: string;
  country?: string;
  address?: { city?: string; country?: string };
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
async function resolveJobFromSlug(
  slug: string,
  countrySlug: string
): Promise<{ jobId: string } | { redirect: string } | null> {
  await connectDB();

  // 1. Canonical slug: filter by country, then match title slug
  const countryValues = getCountryValuesForSlug(countrySlug);
  const countryFilter =
    countryValues.length > 0
      ? { country: { $in: countryValues } }
      : { country: { $in: [] } };

  const canonicalCandidates = await Job.find({
    published: { $ne: false },
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
  const legacyJob = await Job.findOne({
    published: { $ne: false },
    legacySlug: slug,
  })
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
 * Get job by ID (reused from existing job details page)
 */
async function getJob(id: string): Promise<Job | null> {
  try {
    await connectDB();
    
    const job = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate('companyId', 'name logo address offeredActivities offeredServices');
    
    if (!job) {
      return null;
    }

    // Check if job is published (unpublished jobs are hidden from public)
    const jobPublished = job.published;
    if (jobPublished === false) {
      return null;
    }

    // Increment visit count atomically
    // timestamps: false prevents updatedAt from changing (so viewing doesn't reorder listing)
    await Job.findByIdAndUpdate(
      id,
      { $inc: { visitCount: 1 } },
      { timestamps: false }
    );
    
    // Reload the job to get the updated visit count
    const updatedJob = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate('companyId', 'name logo address offeredActivities offeredServices');
    
    if (!updatedJob) {
      return null;
    }

    // Convert to plain object
    const jobObject = updatedJob.toObject();
    
    // Normalize country field
    const countryValue = jobObject.country != null && typeof jobObject.country === 'string'
      ? (jobObject.country.trim() ? jobObject.country.trim().toUpperCase() : null)
      : jobObject.country;
    
    // Ensure recruiter is properly typed after populate
    const recruiter = updatedJob.recruiter && typeof updatedJob.recruiter === 'object' && 'name' in updatedJob.recruiter
      ? {
          name: (updatedJob.recruiter as any).name || '',
          email: (updatedJob.recruiter as any).email || '',
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
    
    // Get all images from JobImage collection (for complete list including hero)
    let allImages: string[] = [];
    let heroImageUrl: string | undefined;
    try {
      const jobImages = await JobImage.find({ 
        jobId: new mongoose.Types.ObjectId(id)
      })
      .sort({ order: 1 })
      .lean();
      
      if (jobImages && jobImages.length > 0) {
        // Extract all image URLs
        allImages = jobImages.map((img: any) => img.imageUrl);
        
        // Find hero image
        const heroImage = jobImages.find((img: any) => img.isHero === true);
        if (heroImage && heroImage.imageUrl) {
          heroImageUrl = heroImage.imageUrl;
        }
      }
    } catch (error) {
      // If JobImage query fails, fall back to pictures array
      console.error('Error fetching images from JobImage collection:', error);
    }
    
    // Fallback to job.pictures array if JobImage collection is empty
    if (allImages.length === 0 && jobObject.pictures && Array.isArray(jobObject.pictures) && jobObject.pictures.length > 0) {
      allImages = jobObject.pictures;
    }
    
    // Fallback hero image: use first image if no explicit hero found
    if (!heroImageUrl && allImages.length > 0) {
      heroImageUrl = allImages[0];
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
        logo: typeof populatedCompany.logo === 'string' ? populatedCompany.logo : undefined,
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
      company: serializedCompanyId?.name ?? '', // Display name from populated companyId
      companyForSummary, // Include company data for summary generation
      published: jobObject.published !== undefined ? jobObject.published : true, // Include published status
      heroImageUrl, // Include hero image URL (explicit isHero or first image fallback)
      pictures: allImages.length > 0 ? allImages : (jobObject.pictures || []), // Use images from JobImage collection, fallback to job.pictures
    } as Job;
  } catch (error) {
    console.error('Error fetching job:', error);
    return null;
  }
}

interface PageProps {
  params: Promise<{ country: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: countrySlug, slug } = await params;

  const result = await resolveJobFromSlug(slug, countrySlug);
  if (!result) {
    return {};
  }
  if ('redirect' in result) {
    permanentRedirect(result.redirect);
  }
  const jobId = result.jobId;
  
  // Get the job data (minimal fetch for metadata)
  try {
    await connectDB();
    const job = await Job.findById(jobId).select('title companyId country').populate('companyId', 'name').lean();
    
    if (!job) {
      return {};
    }
    
    const companyName = (job.companyId && typeof job.companyId === 'object' && 'name' in job.companyId)
      ? String((job.companyId as { name?: string }).name ?? '')
      : '';
    
    // Generate canonical URL
    const canonicalPath = generateJobUrlPath(job.title, job.country);
    const headersList = await headers();
    const host = headersList.get('host') || 'chickenloop.vercel.app';
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    const canonicalUrl = `${protocol}://${host}${canonicalPath}`;
    
    return {
      title: `${job.title} at ${companyName} | Chickenloop`,
      description: `Apply for ${job.title} at ${companyName}. Find watersports jobs on Chickenloop.`,
      alternates: {
        canonical: canonicalUrl,
      },
    };
  } catch {
    return {};
  }
}

export default async function CanonicalJobDetailPage({ params }: PageProps) {
  const { country: countrySlug, slug } = await params;

  const result = await resolveJobFromSlug(slug, countrySlug);
  if (!result) {
    notFound();
  }
  if ('redirect' in result) {
    permanentRedirect(result.redirect);
  }
  const jobId = result.jobId;
  
  // Get the job data
  const job = await getJob(jobId);
  
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
  
  // Get user info from cookies to determine viewer role and permissions
  const user = await getUserFromCookies();
  const isRecruiterView = user?.role === 'recruiter';
  
  // Job owner: recruiter who owns this job (for Job actions box)
  const isJobOwner = user?.role === 'recruiter' && job.recruiterId && user.userId === job.recruiterId;

  // Featured state: for Job actions (only shown to job owner)
  const isFeatured = !!(job.featuredUntil && new Date(job.featuredUntil) > new Date()) || job.featured === true;

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
  const jsonLd = buildJobJsonLd(jobForJsonLd, currentUrl);

  // Generate company summary for display (computed, not stored)
  const companySummary = job.companyForSummary 
    ? generateCompanySummary(job.companyForSummary)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        {/* Google Jobs JSON-LD structured data */}
        {jsonLd && (
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
              {/* Share and Favourites Buttons */}
              <div className="flex items-center gap-3">
                <ShareJobButton
                  jobTitle={job.title}
                  shortDescription={`${getEmploymentTypeLabel(job.type)} position at ${job.company} in ${job.city}`}
                  url={currentUrl}
                />
                <JobFavouriteButton jobId={job._id} />
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
                
                {/* Company Summary - neutral, factual description */}
                {companySummary && (
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {companySummary}
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
      </main>
    </div>
  );
}
