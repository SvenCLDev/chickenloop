import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import User from '@/models/User';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getApplicationWithdrawnEmail } from '@/lib/emailTemplates';
import { guardAgainstRecruiterNotesLeak } from '@/lib/applicationUtils';

// POST - Withdraw application (job seekers only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication and job-seeker role
    const user = requireRole(request, ['job-seeker']);
    await connectDB();
    const { id } = await params;

    // Find application
    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify application belongs to current user
    if (application.candidateId.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent duplicate withdrawal requests
    if (application.status === 'withdrawn') {
      return NextResponse.json(
        { error: 'Application is already withdrawn' },
        { status: 400 }
      );
    }

    // Additional check: if withdrawnAt is already set, prevent withdrawal
    if (application.withdrawnAt) {
      return NextResponse.json(
        { error: 'Application has already been withdrawn' },
        { status: 400 }
      );
    }

    // Update status to withdrawn
    const now = new Date();
    application.status = 'withdrawn';
    application.withdrawnAt = now;
    application.lastActivityAt = now;
    await application.save();

    // Populate for response and email
    await application.populate('jobId', 'title company location');
    await application.populate('recruiterId', 'name email');
    await application.populate('candidateId', 'name email');

    // Send email notification to recruiter (non-blocking)
    try {
      const candidate = await User.findById(application.candidateId).select('name email');
      const recruiter = await User.findById(application.recruiterId).select('name email');
      const job = application.jobId ? await Job.findById(application.jobId).select('title company location') : null;
      
      if (recruiter && recruiter.email && candidate) {
        const emailTemplate = getApplicationWithdrawnEmail({
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          recruiterName: recruiter.name,
          recruiterEmail: recruiter.email,
          jobTitle: job?.title,
          jobCompany: job?.company,
          jobLocation: job?.location,
        });

        await sendEmail({
          to: recruiter.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          tags: [
            { name: 'type', value: 'application' },
            { name: 'event', value: 'application_withdrawn' },
          ],
        });
      }
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send withdrawal notification email:', emailError);
    }

    // Format response - exclude recruiter-only fields for job seekers
    const response: any = {
      _id: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
      lastActivityAt: application.lastActivityAt,
      withdrawnAt: application.withdrawnAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      job: application.jobId ? {
        _id: (application.jobId as any)._id,
        title: (application.jobId as any).title,
        company: (application.jobId as any).company,
        location: (application.jobId as any).location,
      } : null,
    };

    // Explicitly ensure recruiterNotes and internalNotes are never included
    // This endpoint is job-seeker only, so these fields should never be present
    delete response.recruiterNotes;
    delete response.internalNotes;

    // Server-side guard to prevent recruiterNotes leak
    guardAgainstRecruiterNotesLeak(response, 'job-seeker');

    return NextResponse.json(
      {
        message: 'Application withdrawn successfully',
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
    
    console.error('[API /applications/[id]/withdraw POST] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

