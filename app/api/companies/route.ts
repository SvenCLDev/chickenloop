import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import { CachePresets } from '@/lib/cache';
import { getPaginatedCompanies } from '@/lib/companiesList';

// GET - Get companies with optional limit (public endpoint)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const hasPaginationParams = pageParam !== null || limitParam !== null;

    // Paginated list for /companies infinite scroll (legacy behavior when omitted)
    if (hasPaginationParams) {
      const page = Math.max(1, Number(pageParam || '1') || 1);
      const limit = Math.min(50, Math.max(1, Number(limitParam || '20') || 20));
      const { companies, hasMore, totalCount, availableCountries } = await getPaginatedCompanies({
        page,
        limit,
        filters: {
          keyword: searchParams.get('keyword') || undefined,
          country: searchParams.get('country') || undefined,
        },
      });
      const cacheHeaders = CachePresets.short();
      return NextResponse.json(
        { companies, page, limit, hasMore, totalCount, availableCountries },
        { status: 200, headers: cacheHeaders }
      );
    }

    const limit = searchParams.get('limit');
    const featured = searchParams.get('featured');

    // Build query filter
    const queryFilter: any = {};

    // If featured=true, filter for featured companies
    if (featured === 'true') {
      queryFilter.featured = true;
    }

    // Build query
    let query = Company.find(queryFilter)
      .populate('ownerRecruiter', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    let companies = await query;

    // Put "Test-00" prefixed companies at the end so users rarely see them
    companies = companies.sort((a: any, b: any) => {
      const aIsTest = (a.name || '').startsWith('Test-00');
      const bIsTest = (b.name || '').startsWith('Test-00');
      if (aIsTest && !bIsTest) return 1;
      if (!aIsTest && bIsTest) return -1;
      return 0;
    });

    // Format companies for response
    const formattedCompanies = companies.map((company: any) => ({
      id: String(company._id),
      name: company.name,
      description: company.description,
      logo: company.logo,
      pictures: company.pictures,
      address: company.address,
      website: company.website,
      coordinates: company.coordinates,
      featured: company.featured || false,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }));

    // Add cache headers - companies can be cached for 5 minutes
    const cacheHeaders = CachePresets.short();

    return NextResponse.json({ companies: formattedCompanies }, {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/companies:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

