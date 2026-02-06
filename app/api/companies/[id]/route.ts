import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company, { ICompany } from '@/models/Company';

/** Document shape for public company response; may include fields not on current ICompany (e.g. legacy). */
type PublicCompanyDoc = ICompany & {
  offeredActivities?: string[];
  offeredServices?: string[];
  logo?: string;
  pictures?: string[];
};

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

    // Schema does not define socialMedia; expose stable empty value for response shape
    const cleanedSocialMedia: null = null;

    const doc = company as PublicCompanyDoc;
    return NextResponse.json({
      company: {
        id: doc._id,
        name: doc.name,
        description: doc.description,
        address: doc.address,
        coordinates: doc.coordinates,
        website: doc.website,
        contact: {
          email: doc.email ?? null,
          website: doc.website ?? null,
        },
        socialMedia: cleanedSocialMedia,
        offeredActivities: doc.offeredActivities,
        offeredServices: doc.offeredServices,
        logo: doc.logo,
        pictures: doc.pictures,
        owner: doc.ownerRecruiter,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
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

