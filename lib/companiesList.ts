import connectDB from '@/lib/db';
import Company from '@/models/Company';

export interface CompanyListItem {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  pictures?: string[];
  address?: {
    city?: string;
    country?: string;
  };
  website?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CompanyListFilters {
  keyword?: string;
  country?: string;
}

export interface PaginatedCompaniesResult {
  companies: CompanyListItem[];
  hasMore: boolean;
  totalCount: number;
  availableCountries: string[];
}

function deprioritizeTestCompanies(companies: CompanyListItem[]): CompanyListItem[] {
  return [...companies].sort((a, b) => {
    const aIsTest = (a.name || '').startsWith('Test-00');
    const bIsTest = (b.name || '').startsWith('Test-00');
    if (aIsTest && !bIsTest) return 1;
    if (!aIsTest && bIsTest) return -1;
    return 0;
  });
}

export function sortCompanies(companies: CompanyListItem[]): CompanyListItem[] {
  return [...companies].sort((a, b) => {
    const aFeatured = Boolean(a.featured);
    const bFeatured = Boolean(b.featured);
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;

    const aHasPictures = Boolean(a.pictures && a.pictures.length > 0);
    const bHasPictures = Boolean(b.pictures && b.pictures.length > 0);
    if (aHasPictures && !bHasPictures) return -1;
    if (!aHasPictures && bHasPictures) return 1;

    const aHasLocation = !!(a.address?.city?.trim() || a.address?.country?.trim());
    const bHasLocation = !!(b.address?.city?.trim() || b.address?.country?.trim());
    if (aHasLocation && !bHasLocation) return -1;
    if (!aHasLocation && bHasLocation) return 1;

    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

export function filterCompanies(
  companies: CompanyListItem[],
  filters: CompanyListFilters
): CompanyListItem[] {
  let filtered = companies;

  const keyword = filters.keyword?.trim();
  if (keyword) {
    const keywordLower = keyword.toLowerCase();
    filtered = filtered.filter((company) => {
      const nameMatch = company.name?.toLowerCase().includes(keywordLower);
      const descriptionMatch = company.description?.toLowerCase().includes(keywordLower);
      return nameMatch || descriptionMatch;
    });
  }

  const country = filters.country?.trim();
  if (country) {
    filtered = filtered.filter((company) => {
      if (!company.address?.country) return false;
      return company.address.country.toUpperCase() === country.toUpperCase();
    });
  }

  return filtered;
}

function formatCompany(company: {
  _id: unknown;
  name: string;
  description?: string;
  logo?: string | null;
  pictures?: string[];
  address?: CompanyListItem['address'];
  website?: string;
  featured?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}): CompanyListItem {
  return {
    id: String(company._id),
    name: company.name,
    description: company.description,
    logo: company.logo ?? undefined,
    pictures: company.pictures,
    address: company.address,
    website: company.website,
    featured: company.featured || false,
    createdAt:
      company.createdAt instanceof Date
        ? company.createdAt.toISOString()
        : String(company.createdAt),
    updatedAt:
      company.updatedAt instanceof Date
        ? company.updatedAt.toISOString()
        : company.updatedAt
          ? String(company.updatedAt)
          : undefined,
  };
}

function collectAvailableCountries(companies: CompanyListItem[]): string[] {
  const codes = new Set<string>();
  for (const company of companies) {
    const code = company.address?.country?.trim().toUpperCase();
    if (code) codes.add(code);
  }
  return Array.from(codes).sort((a, b) => a.localeCompare(b));
}

export async function getPaginatedCompanies(options: {
  page: number;
  limit: number;
  filters?: CompanyListFilters;
}): Promise<PaginatedCompaniesResult> {
  const page = Math.max(1, options.page);
  const limit = Math.min(50, Math.max(1, options.limit));
  const filters = options.filters ?? {};

  await connectDB();

  const raw = await Company.find({}).sort({ createdAt: -1 }).lean();

  const formatted = deprioritizeTestCompanies(
    sortCompanies(raw.map((company) => formatCompany(company as Parameters<typeof formatCompany>[0])))
  );

  const filtered = filterCompanies(formatted, filters);
  const totalCount = filtered.length;
  const start = (page - 1) * limit;
  const companies = filtered.slice(start, start + limit);

  return {
    companies,
    hasMore: start + limit < totalCount,
    totalCount,
    availableCountries: collectAvailableCountries(formatted),
  };
}
