import { normalizeCountryForStorage } from '@/lib/countryUtils';
import { normalizeUrl } from '@/lib/normalizeUrl';
import { sanitizeRichTextLite } from '@/utils/sanitizeRichTextLite';

export type CompanyCreateBody = {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  coordinates?: { latitude?: number; longitude?: number } | null;
  website?: string;
  contact?: {
    email?: string;
    officePhone?: string;
    whatsapp?: string;
    website?: string;
  };
  socialMedia?: Record<string, string | undefined>;
  offeredActivities?: string[];
  offeredServices?: string[];
  logo?: string;
  pictures?: string[];
  featured?: boolean;
};

export function parseAdminCompanyCreateBody(body: CompanyCreateBody): {
  companyData: Record<string, unknown>;
  error?: string;
} {
  const {
    name,
    description,
    address,
    coordinates,
    website,
    contact,
    socialMedia,
    offeredActivities,
    offeredServices,
    logo,
    pictures,
    featured,
  } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { companyData: {}, error: 'Company name is required' };
  }

  if (coordinates !== undefined && coordinates !== null) {
    const hasValidCoords =
      typeof coordinates.latitude === 'number' &&
      typeof coordinates.longitude === 'number' &&
      Number.isFinite(coordinates.latitude) &&
      Number.isFinite(coordinates.longitude);
    if (!hasValidCoords) {
      return {
        companyData: {},
        error: 'Geolocation coordinates must be valid numbers when provided.',
      };
    }
  }

  let cleanedAddress = address;
  if (address) {
    const normalizedCountry = normalizeCountryForStorage(address.country);
    cleanedAddress = {
      street: address.street?.trim() || undefined,
      city: address.city?.trim() || undefined,
      state: address.state?.trim() || undefined,
      postalCode: address.postalCode?.trim() || undefined,
      country: normalizedCountry || undefined,
    };
    if (
      !cleanedAddress.street &&
      !cleanedAddress.city &&
      !cleanedAddress.state &&
      !cleanedAddress.postalCode &&
      !cleanedAddress.country
    ) {
      cleanedAddress = undefined;
    }
  }

  let cleanedSocialMedia = socialMedia;
  if (socialMedia) {
    cleanedSocialMedia = {
      facebook: normalizeUrl(socialMedia.facebook),
      instagram: normalizeUrl(socialMedia.instagram),
      tiktok: normalizeUrl(socialMedia.tiktok),
      youtube: normalizeUrl(socialMedia.youtube),
      twitter: normalizeUrl(socialMedia.twitter),
    };
    if (
      !cleanedSocialMedia.facebook &&
      !cleanedSocialMedia.instagram &&
      !cleanedSocialMedia.tiktok &&
      !cleanedSocialMedia.youtube &&
      !cleanedSocialMedia.twitter
    ) {
      cleanedSocialMedia = undefined;
    }
  }

  const companyData: Record<string, unknown> = {
    name: name.trim(),
    description: sanitizeRichTextLite(description ?? ''),
    address: cleanedAddress,
    coordinates: coordinates || undefined,
    website: normalizeUrl(website),
    email: contact?.email?.trim().toLowerCase() || undefined,
    socialMedia: cleanedSocialMedia,
    offeredActivities: offeredActivities || [],
    offeredServices: offeredServices || [],
    logo: logo || undefined,
    pictures: pictures || [],
    featured: featured === true,
  };

  if (contact?.website) {
    companyData.website = normalizeUrl(contact.website);
  }

  return { companyData };
}
