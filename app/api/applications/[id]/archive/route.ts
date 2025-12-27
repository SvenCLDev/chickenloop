import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import { requireAuth } from '@/lib/auth';
import { guardAgainstRecruiterNotesLeak } from '@/lib/applicationUtils';

// PATCH - Archive/unarchive application (job seeker or recruiter)
// Body: { archivedByJobSeeker?: boolean, archivedByRecruiter?: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const { archivedByJobSeeker, archivedByRecruiter } = body;

    // Find application
    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Role-based access control and archive flag setting
    if (user.role === 'job-seeker') {
      // Job seekers can only archive their own applications
      if (application.candidateId.toString() !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Validate: job seekers can only set archivedByJobSeeker
      if (archivedByRecruiter !== undefined) {
        return NextResponse.json(
          { error: 'Job seekers can only archive applications for themselves' },
          { status: 403 }
        );
      }
      // Set archivedByJobSeeker flag
      if (archivedByJobSeeker !== undefined) {
        application.archivedByJobSeeker = archivedByJobSeeker;
      } else {
        return NextResponse.json(
          { error: 'archivedByJobSeeker is required for job seekers' },
          { status: 400 }
        );
      }
    } else if (user.role === 'recruiter' || user.role === 'admin') {
      // Recruiters can only archive their own applications
      if (application.recruiterId.toString() !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Validate: recruiters can only set archivedByRecruiter
      if (archivedByJobSeeker !== undefined) {
        return NextResponse.json(
          { error: 'Recruiters can only archive applications for themselves' },
          { status: 403 }
        );
      }
      // Set archivedByRecruiter flag
      if (archivedByRecruiter !== undefined) {
        application.archivedByRecruiter = archivedByRecruiter;
      } else {
        return NextResponse.json(
          { error: 'archivedByRecruiter is required for recruiters' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await application.save();

    // Populate related data for response
    await application.populate('jobId', 'title company location');
    await application.populate('candidateId', 'name email');
    await application.populate('recruiterId', 'name email');

    // Format response - exclude recruiter-only fields for job seekers
    const response: any = {
      _id: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
      lastActivityAt: application.lastActivityAt,
      withdrawnAt: application.withdrawnAt,
      viewedAt: application.viewedAt,
      archivedByJobSeeker: application.archivedByJobSeeker,
      archivedByRecruiter: application.archivedByRecruiter,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      job: application.jobId ? {
        _id: (application.jobId as any)._id,
        title: (application.jobId as any).title,
        company: (application.jobId as any).company,
        location: (application.jobId as any).location,
      } : null,
      candidate: application.candidateId ? {
        _id: (application.candidateId as any)._id,
        name: (application.candidateId as any).name,
        email: (application.candidateId as any).email,
      } : null,
      recruiter: application.recruiterId ? {
        _id: (application.recruiterId as any)._id,
        name: (application.recruiterId as any).name,
        email: (application.recruiterId as any).email,
      } : null,
    };

    // Include recruiter-only fields only for recruiters/admins
    if (user.role === 'recruiter' || user.role === 'admin') {
      response.internalNotes = application.internalNotes;
      response.recruiterNotes = application.recruiterNotes;
    } else {
      // For job seekers, explicitly ensure recruiterNotes is not included
      delete response.recruiterNotes;
      delete response.internalNotes;
    }

    // Server-side guard to prevent recruiterNotes leak
    guardAgainstRecruiterNotesLeak(response, user.role);

    return NextResponse.json(
      {
        message: application.archivedByJobSeeker || application.archivedByRecruiter 
          ? 'Application archived successfully' 
          : 'Application unarchived successfully',
        application: response,
      },
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
    
    console.error('[API /applications/[id]/archive PATCH] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

