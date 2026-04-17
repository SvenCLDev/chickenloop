import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getCountryCodeFromName } from '@/lib/countryUtils';
import User from '@/models/User';
import Company from '@/models/Company';

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const body = await request.json();
    const { recruiterId, name, description, city, country } = body ?? {};

    if (!recruiterId || typeof recruiterId !== 'string' || !mongoose.Types.ObjectId.isValid(recruiterId)) {
      return NextResponse.json(
        { error: 'recruiterId is required and must be a valid id' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!country || typeof country !== 'string') {
      return NextResponse.json(
        { error: 'country is required and must be an ISO-2 code' },
        { status: 400 }
      );
    }

    const normalizedCountry = country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalizedCountry) || !getCountryCodeFromName(normalizedCountry)) {
      return NextResponse.json(
        { error: 'country must be a valid ISO-2 code' },
        { status: 400 }
      );
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const recruiter = await User.findById(recruiterId).session(session);

    if (!recruiter) {
      throw new Error('Recruiter not found');
    }
    if (recruiter.role !== 'recruiter') {
      throw new Error('Selected user is not a recruiter');
    }
    if (recruiter.companyId) {
      const existingCompany = await Company.findById(recruiter.companyId).session(session);
      if (existingCompany) {
        throw new Error('Recruiter already has company');
      }
      recruiter.set('companyId', null);
      await recruiter.save({ session });
    }

    const company = await Company.create(
      [{
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : undefined,
        address: {
          city: typeof city === 'string' && city.trim() ? city.trim() : undefined,
          country: normalizedCountry,
        },
        ownerRecruiter: recruiter._id,
      }],
      { session }
    );

    recruiter.companyId = company[0]._id as mongoose.Types.ObjectId;
    await recruiter.save({ session });

    await session.commitTransaction();
    await session.endSession();

    return NextResponse.json(
      { success: true, company: company[0] },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (session) {
      await session.abortTransaction();
      await session.endSession();
    }

    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (message === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (message === 'Recruiter not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === 'Selected user is not a recruiter' || message === 'Recruiter already has company') {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
