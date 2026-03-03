import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Company, { ICompany } from '@/models/Company';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';

/** Company document shape for recruiter update; may include fields not on current ICompany (e.g. legacy). */
type RecruiterCompanyDoc = ICompany & {
  contact?: { email?: string; officePhone?: string; whatsapp?: string };
  socialMedia?: Record<string, string | undefined>;
  offeredActivities?: string[];
  offeredServices?: string[];
  logo?: string;
  pictures?: string[];
};
import { normalizeCountryForStorage } from '@/lib/countryUtils';
import { normalizeUrl } from '@/lib/normalizeUrl';
import { sanitizeRichTextLite } from '@/utils/sanitizeRichTextLite';

// GET - Get current recruiter's company
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter'], { skipCompanyProfileCheck: true });
    await connectDB();

    const userDoc = await User.findById(user.userId).select('companyId').lean();
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!userDoc.companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await Company.findById(userDoc.companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ company }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === "COMPANY_PROFILE_INCOMPLETE") {
      return NextResponse.json(
        { error: "COMPANY_PROFILE_INCOMPLETE" },
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

// POST - Create a new company (recruiters only, one per recruiter)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter'], { skipCompanyProfileCheck: true });
    await connectDB();

    const userDoc = await User.findById(user.userId).select('companyId').lean();
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Only block creation if they have a companyId that points to an existing company.
    // If companyId is orphaned (company was deleted), allow creation and we'll overwrite companyId below.
    if (userDoc.companyId) {
      const existingCompany = await Company.findById(userDoc.companyId).lean();
      if (existingCompany) {
        return NextResponse.json(
          { error: 'You already have a company. You can only have one company.' },
          { status: 400 }
        );
      }
      // Orphaned companyId: allow creation; User will be updated to new company in the transaction below.
    }

    const { name, description, address, coordinates, website, contact, socialMedia, offeredActivities, offeredServices, logo, pictures } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Sanitize description server-side so we never persist unsafe HTML
    const sanitizedDescription = sanitizeRichTextLite(description ?? '');

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

    const companyData = {
      name,
      description: sanitizedDescription,
      address: cleanedAddress,
      coordinates: coordinates || undefined,
      website: normalizeUrl(website),
      contact: cleanedContact,
      socialMedia: cleanedSocialMedia,
      offeredActivities: offeredActivities || [],
      offeredServices: offeredServices || [],
      logo: logo || undefined,
      pictures: pictures || [],
      ownerRecruiter: user.userId,
    };

    let company;
    try {
      const session = await mongoose.connection.startSession();
      try {
        await session.withTransaction(async () => {
          company = await Company.create([companyData], { session });
          const created = company[0];
          await User.findByIdAndUpdate(
            user.userId,
            { $set: { companyId: created._id } },
            { session }
          );
        });
        company = company![0];
      } finally {
        await session.endSession();
      }
    } catch {
      // Transaction not supported (e.g. standalone MongoDB); run sequentially
      company = await Company.create(companyData);
      await User.findByIdAndUpdate(user.userId, { $set: { companyId: company._id } });
    }

    return NextResponse.json(
      { message: 'Company created successfully', company },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === "COMPANY_PROFILE_INCOMPLETE") {
      return NextResponse.json(
        { error: "COMPANY_PROFILE_INCOMPLETE" },
        { status: 403 }
      );
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
    const user = await requireRole(request, ['recruiter'], { skipCompanyProfileCheck: true });
    await connectDB();

    const userDoc = await User.findById(user.userId).select('companyId').lean();
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!userDoc.companyId) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = await Company.findById(userDoc.companyId);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const companyDoc = company as RecruiterCompanyDoc;

    const { name, description, address, coordinates, website, contact, socialMedia, offeredActivities, offeredServices, logo, pictures } = await request.json();

    // Sanitize description server-side when provided so we never persist unsafe HTML
    const sanitizedDescription = description !== undefined ? sanitizeRichTextLite(description ?? '') : undefined;

    // Validate that coordinates are required for updates
    if (coordinates === undefined || coordinates === null || !coordinates.latitude || !coordinates.longitude) {
      return NextResponse.json(
        { error: 'Geolocation coordinates are required. Please search for and select a location.' },
        { status: 400 }
      );
    }

    if (name) company.name = name;
    if (sanitizedDescription !== undefined) company.description = sanitizedDescription;
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

    if (logo !== undefined) {
      const trimmedLogo = logo?.trim();
      companyDoc.logo = trimmedLogo && trimmedLogo.length > 0 ? trimmedLogo : undefined;
      company.markModified('logo');
    }

    if (pictures !== undefined) {
      companyDoc.pictures = pictures || [];
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
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === "COMPANY_PROFILE_INCOMPLETE") {
      return NextResponse.json(
        { error: "COMPANY_PROFILE_INCOMPLETE" },
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

// DELETE - Delete recruiter's company
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter'], { skipCompanyProfileCheck: true });
    await connectDB();

    const userDoc = await User.findById(user.userId).select('companyId').lean();
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!userDoc.companyId) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = await Company.findById(userDoc.companyId);
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

    // Clear recruiter's companyId so "has company" check stays correct
    await User.findByIdAndUpdate(user.userId, { $unset: { companyId: 1 } });

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
    if (error instanceof Error && error.message === "COMPANY_PROFILE_INCOMPLETE") {
      return NextResponse.json(
        { error: "COMPANY_PROFILE_INCOMPLETE" },
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

