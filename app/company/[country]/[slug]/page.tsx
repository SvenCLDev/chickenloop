import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { getCompanyUrl } from '@/lib/companySlug';
import {
  getCompanyById,
  getCompanyJobs,
  getCompanyIdByCountryAndSlug,
} from '@/lib/companyPageData';
import CompanyPageClient from '@/app/components/CompanyPageClient';

const BASE_URL = 'https://chickenloop.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; slug: string }>;
}): Promise<Metadata> {
  const { country, slug } = await params;
  const companyId = await getCompanyIdByCountryAndSlug(country, slug);
  const company = companyId ? await getCompanyById(companyId) : null;

  if (!company) {
    return { title: 'Company Not Found | Chickenloop' };
  }

  const city = company.address?.city?.trim();
  const countryCode = company.address?.country?.trim();
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : '';
  const location = [city, countryName].filter(Boolean).join(', ');

  const title = `${company.name}${location ? ` – Kitesurf School in ${location}` : ''} | Chickenloop`;
  const description = `${company.name} is a kitesurf school${location ? ` located in ${location}` : ''}. View jobs, activities and contact details on Chickenloop.`;
  const canonicalUrl = `${BASE_URL}${getCompanyUrl(company)}`;

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
  params: Promise<{ country: string; slug: string }>;
}

export default async function CompanySlugPage({ params }: PageProps) {
  const { country, slug } = await params;
  const companyId = await getCompanyIdByCountryAndSlug(country, slug);
  if (!companyId) notFound();

  const [company, jobs] = await Promise.all([
    getCompanyById(companyId),
    getCompanyJobs(companyId),
  ]);

  if (!company) notFound();

  const city = company.address?.city?.trim();
  const countryCode = company.address?.country?.trim();
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : '';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: company.name,
    image: company.logo || company.pictures?.[0],
    url: `${BASE_URL}${getCompanyUrl(company)}`,
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
