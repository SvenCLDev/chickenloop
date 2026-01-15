import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Navbar from '../../components/Navbar';
import ShareJobButton from '../../components/ShareJobButton';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { buildJobJsonLd } from '@/lib/seo/jobJsonLd';
import Link from 'next/link';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import JobFavouriteButton from './JobFavouriteButton';
import JobApplySection from './JobApplySection';
import JobSpamButton from './JobSpamButton';
import JobImageGallery from './JobImageGallery';

export interface CompanyInfo {
  _id?: string;
  id?: string;
  name?: string;
  logo?: string;
  city?: string;
  country?: string;
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
  languages?: string[];
  occupationalAreas?: string[];
  qualifications?: string[];
  pictures?: string[];
  recruiter: {
    name: string;
    email: string;
  };
  createdAt: Date | string;
  updatedAt?: Date | string;
  datePosted?: Date | string;
  validThrough?: Date | string;
  companyId?: CompanyInfo;
  spam?: 'yes' | 'no';
  published?: boolean;
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
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

async function getJob(id: string): Promise<Job | null> {
  try {
    await connectDB();
    
    const job = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate('companyId');
    
    if (!job) {
      return null;
    }

    // Check if job is published (unpublished jobs are hidden from public)
    const jobPublished = job.published;
    if (jobPublished === false) {
      return null;
    }

    // Increment visit count atomically
    await Job.findByIdAndUpdate(id, { $inc: { visitCount: 1 } });
    
    // Reload the job to get the updated visit count
    const updatedJob = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate('companyId');
    
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
    
    // Convert ObjectIds to strings for Client Component compatibility
    const companyId = jobObject.companyId;
    let serializedCompanyId: CompanyInfo | undefined;
    
    if (companyId && typeof companyId === 'object' && companyId !== null && '_id' in companyId) {
      // Type guard: ensure it's a populated object, not just an ObjectId
      const populatedCompany = companyId as unknown as Record<string, unknown>;
      serializedCompanyId = {
        _id: populatedCompany._id ? String(populatedCompany._id) : undefined,
        id: populatedCompany._id ? String(populatedCompany._id) : undefined,
        name: typeof populatedCompany.name === 'string' ? populatedCompany.name : undefined,
        logo: typeof populatedCompany.logo === 'string' ? populatedCompany.logo : undefined,
        city: typeof populatedCompany.city === 'string' ? populatedCompany.city : undefined,
        country: typeof populatedCompany.country === 'string' ? populatedCompany.country : undefined,
      };
    }
    
    return {
      ...jobObject,
      _id: String(jobObject._id), // Convert ObjectId to string
      city: jobObject.city,
      country: countryValue,
      recruiter,
      companyId: serializedCompanyId,
      published: jobObject.published !== undefined ? jobObject.published : true, // Include published status
    } as Job;
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

  // Generate current URL for JSON-LD (server-side)
  const headersList = await headers();
  const host = headersList.get('host') || 'chickenloop.vercel.app';
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  const currentUrl = `${protocol}://${host}/jobs/${id}`;

  // Generate JSON-LD for Google Jobs
  // Convert null country to undefined for buildJobJsonLd
  const jobForJsonLd = {
    ...job,
    country: job.country ?? undefined,
  };
  const jsonLd = buildJobJsonLd(jobForJsonLd, currentUrl);

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

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Job Pictures */}
          <JobImageGallery pictures={job.pictures || []} jobTitle={job.title} />

          <div className="p-8">
            {/* Job Title and Company */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <p className="text-2xl text-gray-600 mb-2">{job.company}</p>
              {/* Share and Favourites Buttons */}
              <div className="flex items-center gap-3">
                <ShareJobButton
                  jobTitle={job.title}
                  shortDescription={`${job.type} position at ${job.company} in ${job.city}`}
                  url={currentUrl}
                />
                <JobFavouriteButton jobId={job._id} />
              </div>
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
                  <span className="capitalize">{job.type.replace('-', ' ')}</span>
                </div>
                {job.salary && (
                  <div className="flex items-center text-gray-700 font-semibold">
                    <span className="mr-2">💰</span>
                    <span>{job.salary}</span>
                  </div>
                )}
              </div>
              
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
                    {job.occupationalAreas.map((area, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                      >
                        {area}
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
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>

            {job.companyId && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Company Info</h2>
                {job.companyId && (job.companyId.id || job.companyId._id) && (
                  <div className="mt-4 text-right">
                    <Link
                      href={`/companies/${job.companyId.id || (typeof job.companyId._id === 'string' ? job.companyId._id : String(job.companyId._id))}`}
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
                applyByEmail={job.applyByEmail}
                applyByWebsite={job.applyByWebsite}
                applyByWhatsApp={job.applyByWhatsApp}
                applicationEmail={job.applicationEmail}
                applicationWebsite={job.applicationWebsite}
                applicationWhatsApp={job.applicationWhatsApp}
              />

              <p className="mt-4 text-sm text-gray-500 italic">
                Please mention that you found this job on chickenloop.com
              </p>
            </div>

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
                
                {/* Right Column - Report Spam Button */}
                <div className="flex-shrink-0">
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
