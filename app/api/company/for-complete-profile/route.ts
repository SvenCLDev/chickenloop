import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import User from '@/models/User';
import { requireRecruiterAllowIncomplete } from '@/lib/auth';
import { normalizeCountryForStorage } from '@/lib/countryUtils';
import { sanitizeRichTextLite } from '@/utils/sanitizeRichTextLite';

// GET - Fetch company for complete-profile form (allows incomplete recruiters)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRecruiterAllowIncomplete(request);
    await connectDB();

    const userDoc = await User.findById(user.userId).select('companyId').lean();
    if (!userDoc?.companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await Company.findById(userDoc.companyId).lean();
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
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update description, city, country (minimal fields for profile completion)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRecruiterAllowIncomplete(request);
    await connectDB();

    const userDoc = await User.findById(user.userId).select('companyId').lean();
    if (!userDoc?.companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await Company.findById(userDoc.companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { description, address } = await request.json();

    if (description !== undefined) {
      const sanitized = sanitizeRichTextLite(description ?? '');
      if (!sanitized || sanitized.trim().length < 50) {
        return NextResponse.json(
          { error: 'Description must be at least 50 characters' },
          { status: 400 }
        );
      }
      company.description = sanitized;
    }

    if (address !== undefined) {
      if (!company.address) company.address = {};
      if (address.city !== undefined) {
        const city = address.city?.trim();
        if (!city) {
          return NextResponse.json(
            { error: 'City is required' },
            { status: 400 }
          );
        }
        company.address.city = city;
      }
      if (address.country !== undefined) {
        const countryCode = normalizeCountryForStorage(address.country);
        if (!countryCode) {
          return NextResponse.json(
            { error: 'Country is required and must be valid' },
            { status: 400 }
          );
        }
        company.address.country = countryCode;
      }
      company.markModified('address');
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
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
