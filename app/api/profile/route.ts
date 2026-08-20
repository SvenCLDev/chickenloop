import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import { JOB_CATEGORIES, type JobCategory } from '@/src/constants/jobCategories';
import { isExperienceLevel, isAvailability, isWorkArea } from '@/lib/domainTypes';
import { applyTalentNetworkFieldsToCv } from '@/lib/talentNetwork/applyToCv';
import { canUserWriteTalentNetworkFields } from '@/lib/talentNetwork/userContext';
import { processReferenceVerificationRequestsForCvId } from '@/lib/talentNetwork/runReferenceVerificationAfterSave';
import { applyWorkLocationFieldsToCv } from '@/lib/workLocation';

// GET - Get current user's CV (job seekers only)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker']);
    await connectDB();

    const cv = await CV.findOne({ jobSeeker: user.userId }).lean();

    if (!cv) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ cv }, { status: 200 });
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

// POST - Create a new CV (job seekers only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker']);
    await connectDB();

    // Check if CV already exists
    const existingCV = await CV.findOne({ jobSeeker: user.userId });
    if (existingCV) {
      return NextResponse.json(
        { error: 'Profile already exists. Please update your existing profile.' },
        { status: 400 }
      );
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
      pictures,
      experienceLevel,
      availability,
      profileSchemaVersion,
      verifiedCertificates,
      seasonalExperience,
      languageSkills,
    } = body;

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Full name and email are required' },
        { status: 400 }
      );
    }

    // Validate lookingForWorkInAreas against JOB_CATEGORIES using type guard
    if (lookingForWorkInAreas && Array.isArray(lookingForWorkInAreas)) {
      const invalidCategories = lookingForWorkInAreas.filter(
        (category: unknown) => !isWorkArea(category) && !JOB_CATEGORIES.includes(category as JobCategory)
      );
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { error: `Invalid job categories: ${invalidCategories.join(', ')}. Valid categories are: ${JOB_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate experienceLevel enum using shared type guard
    if (experienceLevel && !isExperienceLevel(experienceLevel)) {
      return NextResponse.json(
        { error: `Invalid experienceLevel. Valid values are: entry, intermediate, experienced, senior` },
        { status: 400 }
      );
    }

    // Validate availability enum using shared type guard
    if (availability && !isAvailability(availability)) {
      return NextResponse.json(
        { error: `Invalid availability. Valid values are: available_now, available_soon, seasonal, not_available` },
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

    const canWriteTalentNetwork = await canUserWriteTalentNetworkFields(user.userId);
    if (
      canWriteTalentNetwork &&
      (profileSchemaVersion !== undefined ||
        verifiedCertificates !== undefined ||
        seasonalExperience !== undefined ||
        languageSkills !== undefined)
    ) {
      const applied = applyTalentNetworkFieldsToCv(cv, body, {
        forceSchemaVersion: profileSchemaVersion === 2 ? 2 : undefined,
      });
      if (!applied.ok) {
        return NextResponse.json({ error: applied.error }, { status: 400 });
      }
    }

    const workLocationApplied = applyWorkLocationFieldsToCv(cv, body);
    if (!workLocationApplied.ok) {
      return NextResponse.json({ error: workLocationApplied.error }, { status: 400 });
    }

    await cv.save();

    if (cv.profileSchemaVersion === 2) {
      await processReferenceVerificationRequestsForCvId(cv._id);
    }

    const responseCv =
      cv.profileSchemaVersion === 2 ? await CV.findById(cv._id) : cv;

    return NextResponse.json(
      { message: 'Profile created successfully', cv: responseCv ?? cv },
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

// PUT - Update current user's CV (job seekers only)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker']);
    await connectDB();

    const cv = await CV.findOne({ jobSeeker: user.userId });

    if (!cv) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
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
      pictures,
      experienceLevel,
      availability,
      profileSchemaVersion,
      verifiedCertificates,
      seasonalExperience,
      languageSkills,
    } = body;

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
      // Validate lookingForWorkInAreas against JOB_CATEGORIES using type guard
      if (Array.isArray(lookingForWorkInAreas)) {
        const invalidCategories = lookingForWorkInAreas.filter(
          (category: unknown) => !isWorkArea(category) && !JOB_CATEGORIES.includes(category as JobCategory)
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
      // Validate experienceLevel enum using shared type guard
      if (experienceLevel && !isExperienceLevel(experienceLevel)) {
        return NextResponse.json(
          { error: `Invalid experienceLevel. Valid values are: entry, intermediate, experienced, senior` },
          { status: 400 }
        );
      }
      cv.experienceLevel = experienceLevel || undefined;
    }
    if (availability !== undefined) {
      // Validate availability enum using shared type guard
      if (availability && !isAvailability(availability)) {
        return NextResponse.json(
          { error: `Invalid availability. Valid values are: available_now, available_soon, seasonal, not_available` },
          { status: 400 }
        );
      }
      cv.availability = availability || undefined;
    }

    const canWriteTalentNetwork = await canUserWriteTalentNetworkFields(user.userId);
    if (
      canWriteTalentNetwork &&
      (profileSchemaVersion !== undefined ||
        verifiedCertificates !== undefined ||
        seasonalExperience !== undefined ||
        languageSkills !== undefined)
    ) {
      const applied = applyTalentNetworkFieldsToCv(cv, body, {
        forceSchemaVersion: profileSchemaVersion === 2 ? 2 : undefined,
      });
      if (!applied.ok) {
        return NextResponse.json({ error: applied.error }, { status: 400 });
      }
    }

    const workLocationApplied = applyWorkLocationFieldsToCv(cv, body);
    if (!workLocationApplied.ok) {
      return NextResponse.json({ error: workLocationApplied.error }, { status: 400 });
    }

    await cv.save();

    if (cv.profileSchemaVersion === 2) {
      await processReferenceVerificationRequestsForCvId(cv._id);
    }

    const responseCv =
      cv.profileSchemaVersion === 2 ? await CV.findById(cv._id) : cv;

    return NextResponse.json(
      { message: 'Profile updated successfully', cv: responseCv ?? cv },
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

// DELETE - Delete current user's CV (job seekers only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole(request, ['job-seeker']);
    await connectDB();

    const cv = await CV.findOne({ jobSeeker: user.userId });

    if (!cv) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await CV.findByIdAndDelete(cv._id);

    return NextResponse.json(
      { message: 'Profile deleted successfully' },
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

