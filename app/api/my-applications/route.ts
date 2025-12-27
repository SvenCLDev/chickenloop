import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import { requireRole } from '@/lib/auth';
import { guardAgainstRecruiterNotesLeak } from '@/lib/applicationUtils';

// GET - Get all applications for the current job seeker
export async function GET(request: NextRequest) {
  try {
    // Require authentication and job-seeker role
    const user = requireRole(request, ['job-seeker']);
    await connectDB();

    // Fetch applications where candidateId matches the current user
    // Exclude applications archived by the job seeker
    const applications = await Application.find({
      candidateId: user.userId,
      archivedByJobSeeker: { $ne: true },
    })
      .populate({
        path: 'jobId',
        select: 'title location company',
      })
      .select('status appliedAt lastActivityAt jobId')
      .sort({ appliedAt: -1 })
      .lean();

    // Format the response
    const formattedApplications = applications.map((app: any) => {
      const result: any = {
        _id: app._id,
        status: app.status,
        appliedAt: app.appliedAt,
        lastActivityAt: app.lastActivityAt,
      };

      // Include job information if jobId exists
      if (app.jobId) {
        result.job = {
          _id: app.jobId._id,
          title: app.jobId.title,
          location: app.jobId.location,
        };
        result.company = {
          name: app.jobId.company,
        };
      } else {
        // If no jobId, this might be a recruiter contact without a specific job
        result.job = null;
        result.company = null;
      }

      return result;
    });

    // Server-side guard to prevent recruiterNotes leak
    // This endpoint is job-seeker only, so recruiterNotes should never be present
    guardAgainstRecruiterNotesLeak({ applications: formattedApplications }, 'job-seeker');

    return NextResponse.json(
      {
        applications: formattedApplications,
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
    
    console.error('[API /my-applications GET] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

