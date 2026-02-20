import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import CompanyPageClient, { CompanyPageData } from './CompanyPageClient';
import Navbar from '../../components/Navbar';

async function getCompanyById(id: string): Promise<CompanyPageData | null> {
  try {
    await connectDB();
    const company = await Company.findById(id).populate('ownerRecruiter', 'name email').lean();

    if (!company) return null;

    const doc = company as any;
    const ownerRecruiter = doc.ownerRecruiter;
    const owner = ownerRecruiter
      ? {
          id: String(ownerRecruiter._id),
          name: ownerRecruiter.name ?? '',
          email: ownerRecruiter.email ?? '',
        }
      : null;

    return {
      id: String(doc._id),
      name: doc.name,
      description: doc.description,
      address: doc.address ? { ...doc.address } : undefined,
      coordinates: doc.coordinates ? { ...doc.coordinates } : undefined,
      website: doc.website,
      contact: {
        email: doc.email ?? undefined,
        officePhone: doc.contact?.officePhone,
        whatsapp: doc.contact?.whatsapp,
      },
      socialMedia: doc.socialMedia ? { ...doc.socialMedia } : undefined,
      offeredActivities: doc.offeredActivities ? [...(doc.offeredActivities || [])] : undefined,
      offeredServices: doc.offeredServices ? [...(doc.offeredServices || [])] : undefined,
      logo: doc.logo,
      pictures: doc.pictures ? [...(doc.pictures || [])] : undefined,
      owner,
      email: doc.email,
    };
  } catch {
    return null;
  }
}

async function getCompanyJobs(companyId: string) {
  try {
    const companyOid = new mongoose.Types.ObjectId(companyId);
    const jobs = await Job.find({
      companyId: companyOid,
      published: { $ne: false },
    })
      .select('_id title city country companyId')
      .lean();

    return (jobs || [])
      .filter((j: any) => j.companyId && String(j.companyId) === companyId)
      .map((j: any) => ({
        _id: String(j._id),
        title: j.title,
        city: j.city || '',
        country: j.country,
      }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompanyById(id);

  if (!company) {
    return { title: 'Company Not Found | Chickenloop' };
  }

  const city = company.address?.city?.trim();
  const countryCode = company.address?.country?.trim();
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : '';
  const location = [city, countryName].filter(Boolean).join(', ');

  const title = `${company.name}${location ? ` – Kitesurf School in ${location}` : ''} | Chickenloop`;
  const description = `${company.name} is a kitesurf school${location ? ` located in ${location}` : ''}. View jobs, activities and contact details on Chickenloop.`;
  const canonicalUrl = `https://chickenloop.com/companies/${company.id}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyPage({ params }: PageProps) {
  const { id } = await params;
  const [company, jobs] = await Promise.all([
    getCompanyById(id),
    getCompanyJobs(id),
  ]);

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h1>
            <p className="text-gray-600 mb-6">The company you are looking for does not exist.</p>
            <Link href="/" className="text-blue-600 hover:underline font-semibold">
              Return to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const city = company.address?.city?.trim();
  const countryCode = company.address?.country?.trim();
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : '';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: company.name,
    image: company.logo || company.pictures?.[0],
    url: `https://chickenloop.com/companies/${company.id}`,
    email: company.email || company.contact?.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: countryName || countryCode,
    },
  };

  if (company.website) {
    (structuredData as Record<string, unknown>).sameAs = [company.website];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CompanyPageClient company={company} jobs={jobs} />
    </>
  );
}
