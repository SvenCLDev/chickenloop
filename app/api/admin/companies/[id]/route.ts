import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import { createDeleteAuditLog } from '@/lib/audit';
import { normalizeUrl } from '@/lib/normalizeUrl';

// GET - Get a single company (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const company = await Company.findById(id).populate('owner', 'name email');

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
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
        socialMedia: company.socialMedia,
        offeredActivities: company.offeredActivities,
        offeredServices: company.offeredServices,
        pictures: company.pictures,
        logo: company.logo,
        featured: company.featured || false,
        owner: company.owner,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    requireRole(request, ['admin']);
    await connectDB();
    const resolvedParams = await params;
    id = resolvedParams.id;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

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

    // Update contact
    if (contact !== undefined) {
      if (!company.contact) company.contact = {};
      if (contact.email !== undefined) company.contact.email = contact.email?.trim().toLowerCase() || undefined;
      if (contact.officePhone !== undefined) company.contact.officePhone = contact.officePhone?.trim() || undefined;
      if (contact.whatsapp !== undefined) company.contact.whatsapp = contact.whatsapp?.trim() || undefined;
      company.markModified('contact');
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
      if (!company.socialMedia) company.socialMedia = {};
      if (socialMedia.facebook !== undefined) company.socialMedia.facebook = normalizeUrl(socialMedia.facebook);
      if (socialMedia.instagram !== undefined) company.socialMedia.instagram = normalizeUrl(socialMedia.instagram);
      if (socialMedia.tiktok !== undefined) company.socialMedia.tiktok = normalizeUrl(socialMedia.tiktok);
      if (socialMedia.youtube !== undefined) company.socialMedia.youtube = normalizeUrl(socialMedia.youtube);
      if (socialMedia.twitter !== undefined) company.socialMedia.twitter = normalizeUrl(socialMedia.twitter);
      company.markModified('socialMedia');
    }

    if (offeredActivities !== undefined) {
      company.offeredActivities = offeredActivities || [];
      company.markModified('offeredActivities');
    }

    if (offeredServices !== undefined) {
      company.offeredServices = offeredServices || [];
      company.markModified('offeredServices');
    }

    if (pictures !== undefined) {
      company.pictures = pictures || [];
      company.markModified('pictures');
    }

    if (logo !== undefined) {
      company.logo = logo || undefined;
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

    const updatedCompany = await Company.findById(company._id).populate('owner', 'name email');

    if (!updatedCompany) {
      return NextResponse.json(
        { error: 'Company not found after update' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Company updated successfully',
        company: {
          id: String(updatedCompany._id),
          name: updatedCompany.name,
          description: updatedCompany.description,
          address: updatedCompany.address,
          coordinates: updatedCompany.coordinates,
          website: updatedCompany.website,
          contact: updatedCompany.contact,
          socialMedia: updatedCompany.socialMedia,
          offeredActivities: updatedCompany.offeredActivities,
          offeredServices: updatedCompany.offeredServices,
          pictures: updatedCompany.pictures,
          logo: updatedCompany.logo,
          featured: updatedCompany.featured || false,
          owner: updatedCompany.owner,
          createdAt: updatedCompany.createdAt,
          updatedAt: updatedCompany.updatedAt,
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
    const user = requireRole(request, ['admin']);
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
      owner: company.owner ? String(company.owner) : undefined,
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
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
