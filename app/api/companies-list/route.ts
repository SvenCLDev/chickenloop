import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import { CachePresets } from '@/lib/cache';

// GET - Get all companies (public endpoint)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');

    // Build query filter
    const queryFilter: any = {};

    // If featured=true, filter for featured companies
    if (featured === 'true') {
      queryFilter.featured = true;
    }

    const companies = await Company.find(queryFilter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Clean up and minimize payload - return only fields needed for list display
    const cleanedCompanies = companies.map((company: any) => {
      let cleanedSocialMedia = company.socialMedia;
      if (cleanedSocialMedia) {
        cleanedSocialMedia = {
          facebook: cleanedSocialMedia.facebook?.trim() || undefined,
          instagram: cleanedSocialMedia.instagram?.trim() || undefined,
          tiktok: cleanedSocialMedia.tiktok?.trim() || undefined,
          youtube: cleanedSocialMedia.youtube?.trim() || undefined,
          twitter: cleanedSocialMedia.twitter?.trim() || undefined,
        };
        // If all fields are undefined, set to undefined
        if (!cleanedSocialMedia.facebook && !cleanedSocialMedia.instagram &&
          !cleanedSocialMedia.tiktok && !cleanedSocialMedia.youtube &&
          !cleanedSocialMedia.twitter) {
          cleanedSocialMedia = undefined;
        }
      }

      return {
        id: company._id,
        name: company.name,
        // description excluded - loaded on detail page
        address: company.address,
        coordinates: company.coordinates,
        website: company.website,
        contact: company.contact,
        socialMedia: cleanedSocialMedia,
        offeredActivities: company.offeredActivities,
        offeredServices: company.offeredServices,
        logo: company.logo, // Keep logo for list display
        pictures: company.pictures && company.pictures.length > 0 ? [company.pictures[0]] : undefined, // Include first picture for card display
        owner: company.owner,
        featured: company.featured,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      };
    });

    // Add cache headers - companies can be cached for 5 minutes
    const cacheHeaders = CachePresets.short();

    return NextResponse.json({ companies: cleanedCompanies }, {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

