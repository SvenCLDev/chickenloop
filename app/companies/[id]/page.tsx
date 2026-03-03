import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { getCompanyById } from '@/lib/companyPageData';
import { getCompanyUrl } from '@/lib/companySlug';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) return { title: 'Company Not Found | Chickenloop' };
  const canonicalUrl = `https://chickenloop.com${getCompanyUrl(company)}`;
  const city = company.address?.city?.trim();
  const countryCode = company.address?.country?.trim();
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : '';
  const location = [city, countryName].filter(Boolean).join(', ');
  const title = `${company.name}${location ? ` – Kitesurf School in ${location}` : ''} | Chickenloop`;
  const description = `${company.name} is a kitesurf school${location ? ` located in ${location}` : ''}. View jobs, activities and contact details on Chickenloop.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl, type: 'website' },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyPageById({ params }: PageProps) {
  const { id } = await params;
  const company = await getCompanyById(id);

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

  const canonicalPath = getCompanyUrl(company);
  permanentRedirect(canonicalPath);
}
