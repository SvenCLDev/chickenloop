import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { generateSlug, generateCountrySlug, getCountryValuesForSlug } from '@/lib/jobSlug';

export interface CompanyPageData {
  id: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  coordinates?: { latitude: number; longitude: number };
  website?: string;
  contact?: { email?: string; officePhone?: string; whatsapp?: string };
  socialMedia?: Record<string, string>;
  offeredActivities?: string[];
  offeredServices?: string[];
  logo?: string;
  pictures?: string[];
  owner: { id: string; name: string; email: string } | null;
  email?: string;
}

export async function getCompanyById(id: string): Promise<CompanyPageData | null> {
  try {
    await connectDB();
    const company = await Company.findById(id).populate('ownerRecruiter', 'name email').lean();
    if (!company) return null;

    const doc = company as Record<string, unknown>;
    const ownerRecruiter = doc.ownerRecruiter as { _id: unknown; name?: string; email?: string } | null;
    const owner = ownerRecruiter
      ? {
          id: String(ownerRecruiter._id),
          name: ownerRecruiter.name ?? '',
          email: ownerRecruiter.email ?? '',
        }
      : null;

    return {
      id: String(doc._id),
      name: doc.name as string,
      description: doc.description as string | undefined,
      address: doc.address as CompanyPageData['address'],
      coordinates: doc.coordinates as CompanyPageData['coordinates'],
      website: doc.website as string | undefined,
      contact: {
        email: (doc.email as string) ?? undefined,
        officePhone: (doc.contact as { officePhone?: string })?.officePhone,
        whatsapp: (doc.contact as { whatsapp?: string })?.whatsapp,
      },
      socialMedia: doc.socialMedia as CompanyPageData['socialMedia'],
      offeredActivities: doc.offeredActivities as string[] | undefined,
      offeredServices: doc.offeredServices as string[] | undefined,
      logo: doc.logo as string | undefined,
      pictures: doc.pictures as string[] | undefined,
      owner,
      email: doc.email as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function getCompanyJobs(companyId: string) {
  try {
    const companyOid = new mongoose.Types.ObjectId(companyId);
    const jobs = await Job.find({
      companyId: companyOid,
      published: { $ne: false },
    })
      .select('_id title city country companyId')
      .lean();

    return (jobs || [])
      .filter((j) => j.companyId && String(j.companyId) === companyId)
      .map((j) => ({
        _id: String(j._id),
        title: j.title ?? '',
        city: j.city || '',
        country: j.country ?? undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * Find company id by canonical URL params (country slug + company name slug).
 * Returns the first matching company id or null.
 */
export async function getCompanyIdByCountryAndSlug(
  countrySlug: string,
  nameSlug: string
): Promise<string | null> {
  try {
    await connectDB();
    const countryValues = getCountryValuesForSlug(countrySlug).filter((v): v is string => v != null && v !== '');
    const query =
      countrySlug === 'unknown' || countryValues.length === 0
        ? { $or: [{ 'address.country': { $in: [null, ''] } }, { 'address.country': { $exists: false } }] }
        : { 'address.country': { $in: countryValues } };

    const companies = await Company.find(query).select('_id name address').lean();
    const match = (companies as { _id: mongoose.Types.ObjectId; name: string; address?: { country?: string } }[]).find(
      (c) => {
        const cNameSlug = generateSlug(c.name) || 'company';
        if (cNameSlug !== nameSlug) return false;
        const country = c.address?.country != null && String(c.address.country).trim() ? c.address.country : null;
        return generateCountrySlug(country) === countrySlug;
      }
    );
    return match ? String(match._id) : null;
  } catch {
    return null;
  }
}
