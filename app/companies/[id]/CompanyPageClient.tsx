'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import dynamic from 'next/dynamic';
import { getCountryNameFromCode } from '@/lib/countryUtils';
import { OFFERED_ACTIVITIES_LIST } from '@/lib/offeredActivities';
import { OFFERED_SERVICES_LIST } from '@/lib/offeredServices';
import { getJobUrl } from '@/lib/jobSlug';

const MapComponent = dynamic(
  () => import('../../components/CompanyMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <span className="text-gray-500">Loading map...</span>
      </div>
    )
  }
);

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
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  };
  offeredActivities?: string[];
  offeredServices?: string[];
  logo?: string;
  pictures?: string[];
  owner: { id: string; name: string; email: string } | null;
  email?: string;
}

interface Job {
  _id: string;
  title: string;
  city: string;
  country?: string | null;
  companyId?: string | { _id?: string; id?: string };
}

function LocationMap({ coordinates, companyName }: { coordinates: { latitude: number; longitude: number }; companyName: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="border-t pt-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Location</h2>
        <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-100">
          <span className="text-gray-500">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-6 mb-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Location</h2>
      <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200">
        <MapComponent
          latitude={coordinates.latitude}
          longitude={coordinates.longitude}
          companyName={companyName}
        />
      </div>
    </div>
  );
}

const FacebookIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const InstagramIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162z" />
  </svg>
);
const TikTokIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);
const YouTubeIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
const TwitterIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface Props {
  company: CompanyPageData;
  jobs: Job[];
}

export default function CompanyPageClient({ company, jobs }: Props) {
  const { user } = useAuth();
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const formatAddress = () => {
    if (!company.address) return null;
    const parts = [];
    if (company.address.street) parts.push(company.address.street);
    if (company.address.city) parts.push(company.address.city);
    if (company.address.state) parts.push(company.address.state);
    if (company.address.postalCode) parts.push(company.address.postalCode);
    if (company.address.country) {
      parts.push(getCountryNameFromCode(company.address.country));
    }
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const hasValidCoordinates =
    Number.isFinite(company.coordinates?.latitude) &&
    Number.isFinite(company.coordinates?.longitude);

  const companyCountry = company.address?.country;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/companies"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 font-semibold"
        >
          ← Back to Companies
        </Link>

        {user?.role === 'admin' && (
          <div className="mb-6 p-3 border border-gray-300 rounded-md bg-gray-50 text-sm">
            <p className="font-medium text-gray-700 mb-2">Admin Tools</p>
            <Link
              href={`/admin/repair-company/${company.id}`}
              className="inline-block px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 hover:bg-gray-100 font-medium"
            >
              Repair Company Relationships
            </Link>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-6 mb-4">
            {company.logo && company.logo.trim() && (
              <img
                src={company.logo}
                alt={`${company.name} Logo`}
                className="w-24 h-24 object-contain rounded-lg border border-gray-300 bg-white p-2 flex-shrink-0"
              />
            )}
            <h1 className="text-4xl font-bold text-gray-900">{company.name}</h1>
          </div>

          {company.description && (
            <div className="mb-6">
              <p className="text-gray-700 whitespace-pre-wrap">{company.description}</p>
            </div>
          )}

          {/* Internal linking: activities, country */}
          <div className="mb-6 flex flex-wrap gap-3">
            {company.offeredActivities && company.offeredActivities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {company.offeredActivities.slice(0, 3).map((activity) => (
                  <Link
                    key={activity}
                    href={`/jobs?activity=${encodeURIComponent(activity)}`}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200"
                  >
                    {activity}
                  </Link>
                ))}
              </div>
            )}
            {companyCountry && (
              <Link
                href={`/jobs?country=${encodeURIComponent(companyCountry)}`}
                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-200"
              >
                Jobs in {getCountryNameFromCode(companyCountry)}
              </Link>
            )}
          </div>

          {/* Pictures Section */}
          {company.pictures && company.pictures.length > 0 && (
            <div className="border-t pt-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Pictures</h2>
              <div className="grid grid-cols-3 gap-2">
                {company.pictures.map((picture, index) => (
                  <button
                    key={index}
                    onClick={() => { setLightboxIndex(index); setIsLightboxOpen(true); }}
                    className="w-full h-48 overflow-hidden rounded-lg border border-gray-300 p-0"
                    type="button"
                  >
                    <img src={picture} alt={`${company.name} - Image ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox */}
          {isLightboxOpen && company.pictures && company.pictures.length > 0 && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
              <div className="relative max-w-3xl w-full mx-auto" onClick={(e) => e.stopPropagation()}>
                <img src={company.pictures[lightboxIndex]} alt={`${company.name} - Image ${lightboxIndex + 1}`} className="w-full h-[70vh] object-contain bg-black" />
                {company.pictures.length > 1 && (
                  <>
                    <button type="button" onClick={() => setLightboxIndex((prev) => prev === 0 ? company.pictures!.length - 1 : prev - 1)} className="absolute top-1/2 -translate-y-1/2 left-2 bg-white/80 text-gray-900 rounded-full p-2">‹</button>
                    <button type="button" onClick={() => setLightboxIndex((prev) => prev === company.pictures!.length - 1 ? 0 : prev + 1)} className="absolute top-1/2 -translate-y-1/2 right-2 bg-white/80 text-gray-900 rounded-full p-2">›</button>
                  </>
                )}
                <button type="button" onClick={() => setIsLightboxOpen(false)} className="absolute top-2 right-2 bg-white/80 text-gray-900 rounded-full p-2">✕</button>
              </div>
            </div>
          )}

          {/* Offering Section */}
          {((company.offeredActivities?.length ?? 0) > 0 || (company.offeredServices?.length ?? 0) > 0) ? (
            <div className="border-t pt-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Offering</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {(company.offeredActivities?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Offered Activities</h3>
                    <div className="flex flex-wrap gap-2">
                      {(company.offeredActivities ?? []).map((activity, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{activity}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(company.offeredServices?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Offered Services</h3>
                    <div className="flex flex-wrap gap-2">
                      {(company.offeredServices ?? []).map((service, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">{service}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Job Openings Section */}
          {jobs.length > 0 && (
            <div className="border-t pt-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Job Openings</h2>
              <ul className="list-disc list-inside space-y-2">
                {jobs.map((job) => (
                  <li key={job._id} className="text-gray-700">
                    <Link href={getJobUrl(job)} className="text-blue-600 hover:text-blue-800 hover:underline">{job.title}</Link>
                    {', '}
                    <span className="text-gray-600">{job.city.split(',')[0]?.trim() || job.city}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Information */}
          {(company.website || company.contact?.email || company.email || company.contact?.officePhone || company.contact?.whatsapp || company.address) && (
            <div className="border-t pt-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              {formatAddress() && <div className="mb-4"><p className="text-gray-600"><span className="font-semibold">Location:</span> {formatAddress()}</p></div>}
              {company.website && <div className="mb-4"><p className="text-gray-600"><span className="font-semibold">Website:</span> <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{company.website}</a></p></div>}
              {(company.contact?.email || company.email) && <div className="mb-4"><p className="text-gray-600"><span className="font-semibold">E-mail:</span> <a href={`mailto:${company.contact?.email || company.email}`} className="text-blue-600 hover:underline">{company.contact?.email || company.email}</a></p></div>}
              {company.contact?.officePhone && <div className="mb-4"><p className="text-gray-600"><span className="font-semibold">Office Phone:</span> <a href={`tel:${company.contact.officePhone.replace(/\s/g, '')}`} className="text-blue-600 hover:underline">{company.contact.officePhone}</a></p></div>}
              {company.contact?.whatsapp && <div className="mb-4"><p className="text-gray-600"><span className="font-semibold">WhatsApp:</span> <a href={`https://wa.me/${company.contact.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{company.contact.whatsapp}</a></p></div>}
            </div>
          )}

          {hasValidCoordinates ? <LocationMap coordinates={company.coordinates!} companyName={company.name} /> : <div className="text-sm text-gray-500">Location information not yet provided.</div>}

          {company.socialMedia && (company.socialMedia.facebook || company.socialMedia.instagram || company.socialMedia.tiktok || company.socialMedia.youtube || company.socialMedia.twitter) && (
            <div className="border-t pt-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Follow {company.name || 'us'}</h2>
              <div className="flex gap-4 flex-wrap">
                {company.socialMedia.facebook && <a href={company.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all" aria-label="Facebook"><FacebookIcon /></a>}
                {company.socialMedia.instagram && <a href={company.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-lg transition-all" aria-label="Instagram"><InstagramIcon /></a>}
                {company.socialMedia.tiktok && <a href={company.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 text-gray-900 hover:bg-gray-100 rounded-lg transition-all" aria-label="TikTok"><TikTokIcon /></a>}
                {company.socialMedia.youtube && <a href={company.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all" aria-label="YouTube"><YouTubeIcon /></a>}
                {company.socialMedia.twitter && <a href={company.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 text-gray-900 hover:bg-gray-100 rounded-lg transition-all" aria-label="X (Twitter)"><TwitterIcon /></a>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
