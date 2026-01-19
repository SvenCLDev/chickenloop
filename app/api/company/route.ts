import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import { requireRole } from '@/lib/auth';
import { normalizeCountryForStorage } from '@/lib/countryUtils';
import { normalizeUrl } from '@/lib/normalizeUrl';

// GET - Get current recruiter's company
export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();

    const company = await Company.findOne({ owner: user.userId });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ company }, { status: 200 });
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

// POST - Create a new company (recruiters only, one per recruiter)
export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();

    // Check if recruiter already has a company
    const existingCompany = await Company.findOne({ owner: user.userId });
    if (existingCompany) {
      return NextResponse.json(
        { error: 'You already have a company. You can only have one company.' },
        { status: 400 }
      );
    }

    const { name, description, address, coordinates, website, contact, socialMedia, offeredActivities, offeredServices, logo, pictures } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Validate that coordinates are required
    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return NextResponse.json(
        { error: 'Geolocation coordinates are required. Please search for and select a location.' },
        { status: 400 }
      );
    }

    // Clean up empty strings in nested objects
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
      // If all fields are undefined, set to undefined
      if (!cleanedAddress.street && !cleanedAddress.city && !cleanedAddress.state &&
        !cleanedAddress.postalCode && !cleanedAddress.country) {
        cleanedAddress = undefined;
      }
    }

    let cleanedContact = contact;
    if (contact) {
      cleanedContact = {
        email: contact.email?.trim().toLowerCase() || undefined,
        officePhone: contact.officePhone?.trim() || undefined,
        whatsapp: contact.whatsapp?.trim() || undefined,
      };
      // If all fields are undefined, set to undefined
      if (!cleanedContact.email && !cleanedContact.officePhone && !cleanedContact.whatsapp) {
        cleanedContact = undefined;
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
      // If all fields are undefined, set to undefined
      if (!cleanedSocialMedia.facebook && !cleanedSocialMedia.instagram &&
        !cleanedSocialMedia.tiktok && !cleanedSocialMedia.youtube &&
        !cleanedSocialMedia.twitter) {
        cleanedSocialMedia = undefined;
      }
    }

    const company = await Company.create({
      name,
      description,
      address: cleanedAddress,
      coordinates: coordinates || undefined,
      website: normalizeUrl(website),
      contact: cleanedContact,
      socialMedia: cleanedSocialMedia,
      offeredActivities: offeredActivities || [],
      offeredServices: offeredServices || [],
      logo: logo || undefined,
      pictures: pictures || [],
      owner: user.userId,
    });

    return NextResponse.json(
      { message: 'Company created successfully', company },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Check for MongoDB duplicate key error
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      return NextResponse.json(
        { error: 'You already have a company' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update recruiter's company
export async function PUT(request: NextRequest) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();

    const company = await Company.findOne({ owner: user.userId });
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const { name, description, address, coordinates, website, contact, socialMedia, offeredActivities, offeredServices, logo, pictures } = await request.json();

    // Validate that coordinates are required for updates
    if (coordinates === undefined || coordinates === null || !coordinates.latitude || !coordinates.longitude) {
      return NextResponse.json(
        { error: 'Geolocation coordinates are required. Please search for and select a location.' },
        { status: 400 }
      );
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
      if (address.country !== undefined) company.address.country = normalizeCountryForStorage(address.country) || undefined;
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

    if (logo !== undefined) {
      // Only update logo if it's a non-empty string, otherwise clear it
      const trimmedLogo = logo?.trim();
      company.logo = trimmedLogo && trimmedLogo.length > 0 ? trimmedLogo : undefined;
      company.markModified('logo');
    }

    if (pictures !== undefined) {
      company.pictures = pictures || [];
      company.markModified('pictures');
    }

    await company.save();

    return NextResponse.json(
      { message: 'Company updated successfully', company },
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

// DELETE - Delete recruiter's company
export async function DELETE(request: NextRequest) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();

    const company = await Company.findOne({ owner: user.userId });
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Delete all jobs associated with this company
    const Job = (await import('@/models/Job')).default;
    await Job.deleteMany({ companyId: company._id });

    // Delete the company
    await Company.findByIdAndDelete(company._id);

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

