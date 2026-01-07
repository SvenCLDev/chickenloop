import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';

// GET - Get current user's CV (job seekers only)
export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, ['job-seeker']);
    await connectDB();

    const cv = await CV.findOne({ jobSeeker: user.userId }).lean();

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

// POST - Create a new CV (job seekers only)
export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, ['job-seeker']);
    await connectDB();

    // Check if CV already exists
    const existingCV = await CV.findOne({ jobSeeker: user.userId });
    if (existingCV) {
      return NextResponse.json(
        { error: 'CV already exists. Please update your existing CV.' },
        { status: 400 }
      );
    }

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
      pictures,
      experienceLevel,
      availability,
    } = await request.json();

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Full name and email are required' },
        { status: 400 }
      );
    }

    // Validate lookingForWorkInAreas against JOB_CATEGORIES
    if (lookingForWorkInAreas && Array.isArray(lookingForWorkInAreas)) {
      const invalidCategories = lookingForWorkInAreas.filter(
        (category: string) => !JOB_CATEGORIES.includes(category as any)
      );
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { error: `Invalid job categories: ${invalidCategories.join(', ')}. Valid categories are: ${JOB_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate experienceLevel enum
    const validExperienceLevels = ['entry', 'intermediate', 'experienced', 'senior'];
    if (experienceLevel && !validExperienceLevels.includes(experienceLevel)) {
      return NextResponse.json(
        { error: `Invalid experienceLevel. Valid values are: ${validExperienceLevels.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate availability enum
    const validAvailability = ['available_now', 'available_soon', 'seasonal', 'not_available'];
    if (availability && !validAvailability.includes(availability)) {
      return NextResponse.json(
        { error: `Invalid availability. Valid values are: ${validAvailability.join(', ')}` },
        { status: 400 }
      );
    }

    const cv = await CV.create({
      fullName,
      email,
      phone,
      address,
      summary,
      experience: experience || [],
      education: education || [],
      skills: skills || [],
      certifications: certifications || [],
      professionalCertifications: professionalCertifications || [],
      experienceAndSkill: experienceAndSkill || [],
      languages: languages || [],
      lookingForWorkInAreas: lookingForWorkInAreas || [],
      pictures: pictures || [],
      experienceLevel,
      availability,
      published: true, // New CVs are published by default
      jobSeeker: user.userId,
    });

    return NextResponse.json(
      { message: 'CV created successfully', cv },
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
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update current user's CV (job seekers only)
export async function PUT(request: NextRequest) {
  try {
    const user = requireRole(request, ['job-seeker']);
    await connectDB();

    const cv = await CV.findOne({ jobSeeker: user.userId });

    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

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
      pictures,
      experienceLevel,
      availability,
    } = await request.json();

    if (fullName) cv.fullName = fullName;
    if (email) cv.email = email;
    if (phone !== undefined) cv.phone = phone;
    if (address !== undefined) cv.address = address;
    if (summary !== undefined) cv.summary = summary;
    if (experience !== undefined) cv.experience = experience;
    if (education !== undefined) cv.education = education;
    if (skills !== undefined) cv.skills = skills;
    if (certifications !== undefined) cv.certifications = certifications;
    if (professionalCertifications !== undefined) {
      cv.professionalCertifications = professionalCertifications || [];
      cv.markModified('professionalCertifications');
    }
    if (experienceAndSkill !== undefined) {
      cv.experienceAndSkill = experienceAndSkill || [];
      cv.markModified('experienceAndSkill');
    }
    if (languages !== undefined) {
      cv.languages = languages || [];
      cv.markModified('languages');
    }
    if (lookingForWorkInAreas !== undefined) {
      // Validate lookingForWorkInAreas against JOB_CATEGORIES
      if (Array.isArray(lookingForWorkInAreas)) {
        const invalidCategories = lookingForWorkInAreas.filter(
          (category: string) => !JOB_CATEGORIES.includes(category as any)
        );
        if (invalidCategories.length > 0) {
          return NextResponse.json(
            { error: `Invalid job categories: ${invalidCategories.join(', ')}. Valid categories are: ${JOB_CATEGORIES.join(', ')}` },
            { status: 400 }
          );
        }
      }
      cv.lookingForWorkInAreas = lookingForWorkInAreas || [];
      cv.markModified('lookingForWorkInAreas');
    }
    if (pictures !== undefined) {
      cv.pictures = pictures || [];
      cv.markModified('pictures');
    }
    if (experienceLevel !== undefined) {
      // Validate experienceLevel enum
      const validExperienceLevels = ['entry', 'intermediate', 'experienced', 'senior'];
      if (experienceLevel && !validExperienceLevels.includes(experienceLevel)) {
        return NextResponse.json(
          { error: `Invalid experienceLevel. Valid values are: ${validExperienceLevels.join(', ')}` },
          { status: 400 }
        );
      }
      cv.experienceLevel = experienceLevel || undefined;
    }
    if (availability !== undefined) {
      // Validate availability enum
      const validAvailability = ['available_now', 'available_soon', 'seasonal', 'not_available'];
      if (availability && !validAvailability.includes(availability)) {
        return NextResponse.json(
          { error: `Invalid availability. Valid values are: ${validAvailability.join(', ')}` },
          { status: 400 }
        );
      }
      cv.availability = availability || undefined;
    }

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

// DELETE - Delete current user's CV (job seekers only)
export async function DELETE(request: NextRequest) {
  try {
    const user = requireRole(request, ['job-seeker']);
    await connectDB();

    const cv = await CV.findOne({ jobSeeker: user.userId });

    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    await CV.findByIdAndDelete(cv._id);

    return NextResponse.json(
      { message: 'CV deleted successfully' },
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

