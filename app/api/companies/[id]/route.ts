import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';

// GET - Get a company by ID (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const company = await Company.findById(id).populate('ownerRecruiter', 'name email');

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Clean up social media: convert empty strings to undefined
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

    return NextResponse.json({
      company: {
        id: company._id,
        name: company.name,
        description: company.description,
        address: company.address,
        coordinates: company.coordinates,
        website: company.website,
        contact: company.contact,
        socialMedia: cleanedSocialMedia,
        offeredActivities: company.offeredActivities,
        offeredServices: company.offeredServices,
        logo: company.logo,
        pictures: company.pictures,
        owner: company.ownerRecruiter,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

