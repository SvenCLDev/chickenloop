import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company, { ICompany } from '@/models/Company';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import { createDeleteAuditLog } from '@/lib/audit';
import { normalizeUrl } from '@/lib/normalizeUrl';

/** Document shape for admin responses; may include fields not on current ICompany (e.g. legacy or future). */
type AdminCompanyDoc = ICompany & {
  socialMedia?: Record<string, string | undefined>;
  offeredActivities?: string[];
  offeredServices?: string[];
  pictures?: string[];
  logo?: string;
};

// GET - Get a single company (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const company = await Company.findById(id).populate('ownerRecruiter', 'name email');

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const doc = company as AdminCompanyDoc;
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
        socialMedia: doc.socialMedia,
        offeredActivities: doc.offeredActivities,
        offeredServices: doc.offeredServices,
        pictures: doc.pictures,
        logo: doc.logo,
        featured: doc.featured || false,
        owner: doc.ownerRecruiter,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a company (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const resolvedParams = await params;
    id = resolvedParams.id;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyDoc = company as AdminCompanyDoc;

    let updateData;
    try {
      updateData = await request.json();
    } catch (jsonError: any) {
      console.error(`[API /admin/companies/${id}] Error parsing JSON:`, jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { name, description, address, coordinates, website, contact, socialMedia, offeredActivities, offeredServices, pictures, logo, featured } = updateData;

    // Check if this is a featured-only update (only featured field is present and defined)
    const updateKeys = Object.keys(updateData).filter(key => updateData[key] !== undefined);
    const isFeaturedOnlyUpdate = updateKeys.length === 1 && updateKeys[0] === 'featured';

    console.log(`[API /admin/companies/${id}] Update data keys:`, updateKeys);
    console.log(`[API /admin/companies/${id}] Is featured-only update:`, isFeaturedOnlyUpdate);

    // Validate that coordinates are required for updates (unless it's a featured-only update)
    if (!isFeaturedOnlyUpdate) {
      // For non-featured-only updates, we need coordinates
      // But if coordinates are not provided, use existing ones from the company
      if (coordinates === undefined || coordinates === null) {
        // Use existing coordinates if not provided
        if (!company.coordinates || !company.coordinates.latitude || !company.coordinates.longitude) {
          return NextResponse.json(
            { error: 'Geolocation coordinates are required. Please search for and select a location.' },
            { status: 400 }
          );
        }
      } else if (!coordinates.latitude || !coordinates.longitude) {
        return NextResponse.json(
          { error: 'Geolocation coordinates are required. Please search for and select a location.' },
          { status: 400 }
        );
      }
    }

    if (name) company.name = name;
    if (description !== undefined) company.description = description;
    if (website !== undefined) company.website = normalizeUrl(website);

    // Update contact (map to schema fields: email, website)
    if (contact !== undefined) {
      if (contact.email !== undefined) company.email = contact.email?.trim().toLowerCase() || undefined;
      if (contact.website !== undefined) company.website = normalizeUrl(contact.website);
      company.markModified('email');
      company.markModified('website');
    }

    // Update nested objects properly - normalize empty strings to undefined
    if (address !== undefined) {
      if (!company.address) company.address = {};
      if (address.street !== undefined) company.address.street = address.street?.trim() || undefined;
      if (address.city !== undefined) company.address.city = address.city?.trim() || undefined;
      if (address.state !== undefined) company.address.state = address.state?.trim() || undefined;
      if (address.postalCode !== undefined) company.address.postalCode = address.postalCode?.trim() || undefined;
      if (address.country !== undefined) company.address.country = address.country?.trim().toUpperCase() || undefined;
      company.markModified('address');
    }

    if (coordinates !== undefined && coordinates !== null) {
      if (!company.coordinates) company.coordinates = { latitude: 0, longitude: 0 };
      if (coordinates.latitude !== undefined && coordinates.latitude !== null) company.coordinates.latitude = coordinates.latitude;
      if (coordinates.longitude !== undefined && coordinates.longitude !== null) company.coordinates.longitude = coordinates.longitude;
      company.markModified('coordinates');
    }

    if (socialMedia !== undefined) {
      if (!companyDoc.socialMedia) companyDoc.socialMedia = {};
      if (socialMedia.facebook !== undefined) companyDoc.socialMedia.facebook = normalizeUrl(socialMedia.facebook);
      if (socialMedia.instagram !== undefined) companyDoc.socialMedia.instagram = normalizeUrl(socialMedia.instagram);
      if (socialMedia.tiktok !== undefined) companyDoc.socialMedia.tiktok = normalizeUrl(socialMedia.tiktok);
      if (socialMedia.youtube !== undefined) companyDoc.socialMedia.youtube = normalizeUrl(socialMedia.youtube);
      if (socialMedia.twitter !== undefined) companyDoc.socialMedia.twitter = normalizeUrl(socialMedia.twitter);
      company.markModified('socialMedia');
    }

    if (offeredActivities !== undefined) {
      companyDoc.offeredActivities = offeredActivities || [];
      company.markModified('offeredActivities');
    }

    if (offeredServices !== undefined) {
      companyDoc.offeredServices = offeredServices || [];
      company.markModified('offeredServices');
    }

    if (pictures !== undefined) {
      companyDoc.pictures = pictures || [];
      company.markModified('pictures');
    }

    if (logo !== undefined) {
      companyDoc.logo = logo || undefined;
      company.markModified('logo');
    }

    // Update featured status
    if (featured !== undefined) {
      const oldFeatured = company.featured;
      // Explicitly set to true or false (not just truthy/falsy)
      company.featured = featured === true;
      company.markModified('featured'); // Explicitly mark as modified to ensure save
      console.log(`[API /admin/companies/${id}] Updating featured status from ${oldFeatured} to ${company.featured}`);
    }

    await company.save();

    // Verify the save worked
    const savedCompany = await Company.findById(company._id);
    console.log(`[API /admin/companies/${id}] Company saved. Verified featured status in DB: ${savedCompany?.featured}`);

    const updatedCompany = await Company.findById(company._id).populate('ownerRecruiter', 'name email');

    if (!updatedCompany) {
      return NextResponse.json(
        { error: 'Company not found after update' },
        { status: 404 }
      );
    }

    const updatedDoc = updatedCompany as AdminCompanyDoc;
    return NextResponse.json(
      {
        message: 'Company updated successfully',
        company: {
          id: String(updatedDoc._id),
          name: updatedDoc.name,
          description: updatedDoc.description,
          address: updatedDoc.address,
          coordinates: updatedDoc.coordinates,
          website: updatedDoc.website,
          contact: {
            email: updatedDoc.email ?? null,
            website: updatedDoc.website ?? null,
          },
          socialMedia: updatedDoc.socialMedia,
          offeredActivities: updatedDoc.offeredActivities,
          offeredServices: updatedDoc.offeredServices,
          pictures: updatedDoc.pictures,
          logo: updatedDoc.logo,
          featured: updatedDoc.featured || false,
          owner: updatedDoc.ownerRecruiter,
          createdAt: updatedDoc.createdAt,
          updatedAt: updatedDoc.updatedAt,
        }
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const companyId = id || 'unknown';
    console.error(`[API /admin/companies/${companyId}] Error updating company:`, error);

    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure we always return JSON, even for unexpected errors
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete a company (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Count jobs that will be deleted
    const jobsCount = await Job.countDocuments({ companyId: company._id });

    // Store company data for audit log before deletion
    const companyData = {
      id: String(company._id),
      name: company.name,
      owner: company.ownerRecruiter ? String(company.ownerRecruiter) : undefined,
      jobsCount,
    };

    // Delete associated jobs
    await Job.deleteMany({ companyId: company._id });

    // Delete the company
    await Company.findByIdAndDelete(id);

    // Create audit log
    await createDeleteAuditLog(request, {
      entityType: 'company',
      entityId: id,
      userId: user.userId,
      before: companyData,
      reason: `Deleted company "${company.name}" and ${jobsCount} associated job(s)`,
      metadata: { jobsDeleted: jobsCount },
    });

    return NextResponse.json(
      { message: 'Company deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
