/**
 * Google Jobs JSON-LD structured data builder
 * 
 * Generates schema.org JobPosting structured data for Google Jobs indexing.
 * This helps jobs appear in Google Jobs search results.
 * 
 * Note: Job descriptions are sanitized (HTML stripped) at this JSON-LD boundary
 * to ensure clean text-only content as required by Google Jobs. This does NOT
 * affect how descriptions are stored or displayed in the UI.
 */

import { stripHtmlToText } from '@/lib/sanitizeText';

interface JobForJsonLd {
  _id: string;
  title: string;
  description: string;
  company?: string;
  city: string;
  country?: string;
  salary?: string;
  type: string;
  datePosted?: string | Date;
  validThrough?: string | Date;
  createdAt?: string | Date;
  companyId?: {
    name?: string;
    website?: string;
    logo?: string;
  };
  /** Legacy migration: original company text from Drupal */
  legacy?: { originalCompanyText?: string };
  applicationWebsite?: string;
  applicationEmail?: string;
}

/**
 * Builds a schema.org JobPosting JSON-LD object for Google Jobs
 * 
 * @param job - The job object from the database/API
 * @param jobUrl - Optional canonical URL of the job posting page
 * @returns A plain JavaScript object ready for JSON.stringify, or null if job is invalid
 */
export function buildJobJsonLd(job: JobForJsonLd | null, jobUrl?: string): object | null {
  if (!job || !job._id || !job.description) {
    return null;
  }

  // Title is required by Google Jobs - must be non-empty after trim
  const title = (job.title != null && String(job.title).trim()) ? String(job.title).trim() : null;
  if (!title) {
    return null;
  }

  // jobLocation.address.addressLocality (city) is required - must be non-empty after trim
  const city = (job.city != null && String(job.city).trim()) ? String(job.city).trim() : null;
  if (!city) {
    return null;
  }

  // Derive company name: job.company, populated companyId.name, or legacy migration text
  const companyName =
    (job.company && job.company.trim()) ||
    (job.companyId && typeof job.companyId === 'object' && job.companyId.name
      ? String(job.companyId.name).trim()
      : '') ||
    (job.legacy?.originalCompanyText && job.legacy.originalCompanyText.trim()
      ? job.legacy.originalCompanyText.trim()
      : '') ||
    'Company'; // Fallback so hiringOrganization is always valid for Google

  // Normalize dates to ISO 8601 strings
  const normalizeDate = (date: string | Date | undefined, fallback?: string | Date): string | undefined => {
    if (date) {
      if (date instanceof Date) {
        return date.toISOString();
      }
      if (typeof date === 'string') {
        // If it's already an ISO string, return it; otherwise try to parse it
        try {
          return new Date(date).toISOString();
        } catch {
          return undefined;
        }
      }
    }
    if (fallback) {
      if (fallback instanceof Date) {
        return fallback.toISOString();
      }
      if (typeof fallback === 'string') {
        try {
          return new Date(fallback).toISOString();
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  };

  const datePosted = normalizeDate(job.datePosted, job.createdAt) || new Date().toISOString();
  const validThrough = normalizeDate(job.validThrough);

  // Map employment type to schema.org values
  const employmentTypeMap: Record<string, string> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    'contract': 'CONTRACTOR',
    'freelance': 'CONTRACTOR',
  };
  const employmentType = (job.type && (employmentTypeMap[job.type] || String(job.type).toUpperCase())) || 'OTHER';

  // Build the base JobPosting object
  // datePosted is required by Google Jobs, so we ensure it's always present
  // 
  // IMPORTANT: Description is sanitized (HTML stripped) ONLY at this JSON-LD boundary.
  // This ensures Google Jobs receives clean text-only content, even if descriptions
  // accidentally contain HTML. UI rendering remains unchanged (plain text with whitespace-pre-wrap).
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description: stripHtmlToText(job.description),
    identifier: {
      '@type': 'PropertyValue',
      name: companyName,
      value: job._id,
    },
    datePosted: datePosted,
    employmentType: employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city,
        ...(job.country && String(job.country).trim().length === 2 && { addressCountry: String(job.country).trim().toUpperCase() }),
      },
    },
  };

  // Add job URL if provided (canonical URL of the job posting page)
  if (jobUrl) {
    jsonLd.url = jobUrl;
  } else if (job.applicationWebsite) {
    // Fallback to application website if no job URL provided
    jsonLd.url = job.applicationWebsite;
  }

  // Add validThrough if available
  if (validThrough) {
    jsonLd.validThrough = validThrough;
  }

  // Add baseSalary if available
  if (job.salary) {
    jsonLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD', // Default to USD, could be enhanced to detect currency from salary string
      value: {
        '@type': 'QuantitativeValue',
        value: job.salary,
        unitText: 'MONTH', // Default assumption, could be enhanced
      },
    };
  }

  // Add company website if available
  if (job.companyId?.website) {
    jsonLd.hiringOrganization.sameAs = job.companyId.website;
  }

  // Add company logo if available
  if (job.companyId?.logo) {
    jsonLd.hiringOrganization.logo = job.companyId.logo;
  }

  // Add directApply if application email or website is available
  if (job.applicationEmail || job.applicationWebsite) {
    jsonLd.directApply = true;
  }

  return jsonLd;
}

