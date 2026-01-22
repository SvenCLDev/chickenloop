import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import { isExperienceLevel, isAvailability, isWorkArea } from '@/lib/domainTypes';
import { JOB_CATEGORIES, type JobCategory } from '@/src/constants/jobCategories';

// GET - Get a single CV by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const cv = await CV.findById(id).populate('jobSeeker', 'name email');

    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    return NextResponse.json({ cv }, { status: 200 });
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

// PUT - Update a CV by ID (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const cv = await CV.findById(id);

    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      address,
      summary,
      experience,
      education,
      skills,
      certifications,
      professionalCertifications,
      experienceAndSkill,
      languages,
      lookingForWorkInAreas,
      experienceLevel,
      availability,
      published,
    } = body;

    // Validate required fields
    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Full name and email are required' },
        { status: 400 }
      );
    }

    // Validate experience level enum
    if (experienceLevel && !isExperienceLevel(experienceLevel)) {
      return NextResponse.json(
        { error: `Invalid experience level. Valid values are: entry, intermediate, experienced, senior` },
        { status: 400 }
      );
    }

    // Validate availability enum
    if (availability && !isAvailability(availability)) {
      return NextResponse.json(
        { error: `Invalid availability. Valid values are: available_now, available_soon, seasonal, not_available` },
        { status: 400 }
      );
    }

    // Validate work areas
    if (lookingForWorkInAreas && Array.isArray(lookingForWorkInAreas)) {
      for (const area of lookingForWorkInAreas) {
        if (!isWorkArea(area)) {
          return NextResponse.json(
            { error: `Invalid work area: ${area}` },
            { status: 400 }
          );
        }
      }
    }

    // Update CV fields
    if (fullName !== undefined) cv.fullName = fullName;
    if (email !== undefined) cv.email = email;
    if (phone !== undefined) cv.phone = phone;
    if (address !== undefined) cv.address = address;
    if (summary !== undefined) cv.summary = summary;
    if (experience !== undefined) cv.experience = experience || [];
    if (education !== undefined) cv.education = education || [];
    if (skills !== undefined) cv.skills = skills || [];
    if (certifications !== undefined) cv.certifications = certifications || [];
    if (professionalCertifications !== undefined) cv.professionalCertifications = professionalCertifications || [];
    if (experienceAndSkill !== undefined) cv.experienceAndSkill = experienceAndSkill || [];
    if (languages !== undefined) cv.languages = languages || [];
    if (lookingForWorkInAreas !== undefined) cv.lookingForWorkInAreas = lookingForWorkInAreas || [];
    if (experienceLevel !== undefined) cv.experienceLevel = experienceLevel;
    if (availability !== undefined) cv.availability = availability;
    if (published !== undefined) cv.published = published;
    if (body.pictures !== undefined) cv.pictures = body.pictures || [];

    await cv.save();

    return NextResponse.json(
      { message: 'CV updated successfully', cv },
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
