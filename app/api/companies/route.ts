import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import { CachePresets } from '@/lib/cache';

// GET - Get companies with optional limit (public endpoint)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
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
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const companies = await query;

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

