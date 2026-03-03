import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';

// GET - Get all favourite candidates for the current user (recruiters only)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    await connectDB();

    const userData = await User.findById(user.userId).lean();
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const rawFavourites = (userData as any).favouriteCandidates || [];
    // favouriteCandidates stores CV _ids (see toggle in candidates-list/[id]/favourite)
    const favouriteCvIds = rawFavourites.filter((id: any) => id != null);

    if (favouriteCvIds.length === 0) {
      return NextResponse.json({ cvs: [] }, { status: 200 });
    }

    const cvs = await CV.find({
      _id: { $in: favouriteCvIds },
      published: { $ne: false }, // Only get published CVs
    })
      .populate('jobSeeker', 'name email lastOnline')
      .sort({ createdAt: -1 })
      .lean();

    // Map CVs to include all necessary fields
    const cvsWithData = cvs.map((cv: any) => ({
      _id: cv._id,
      id: cv._id,
      fullName: cv.fullName,
      email: cv.email,
      phone: cv.phone,
      address: cv.address,
      summary: cv.summary,
      experience: cv.experience || [],
      education: cv.education || [],
      skills: cv.skills || [],
      certifications: cv.certifications || [],
      professionalCertifications: cv.professionalCertifications || [],
      experienceAndSkill: cv.experienceAndSkill || [],
      languages: cv.languages || [],
      lookingForWorkInAreas: cv.lookingForWorkInAreas || [],
      pictures: cv.pictures || [],
      jobSeeker: cv.jobSeeker,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
    }));

    return NextResponse.json({ cvs: cvsWithData }, { status: 200 });
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









