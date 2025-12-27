import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getRecruiterContactedEmail } from '@/lib/emailTemplates';

// POST - Send contact email to candidate (recruiters only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();
    const { id } = await params;

    // Find application and verify it belongs to this recruiter
    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify recruiter owns this application
    if (application.recruiterId.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get candidate and recruiter details
    const candidate = await User.findById(application.candidateId).select('name email');
    const recruiter = await User.findById(application.recruiterId).select('name email');
    
    if (!candidate || !recruiter || !candidate.email) {
      return NextResponse.json(
        { error: 'Candidate or recruiter information not found' },
        { status: 404 }
      );
    }

    // Get job details if available
    let jobTitle: string | undefined;
    let jobCompany: string | undefined;
    let jobLocation: string | undefined;

    if (application.jobId) {
      const job = await Job.findById(application.jobId).select('title company location');
      if (job) {
        jobTitle = job.title;
        jobCompany = job.company;
        jobLocation = job.location;
      }
    }

    // Send email notification to candidate
    try {
      const emailTemplate = getRecruiterContactedEmail({
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        recruiterName: recruiter.name,
        recruiterEmail: recruiter.email,
        jobTitle,
        jobCompany,
        jobLocation,
      });

      await sendEmail({
        to: candidate.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        replyTo: recruiter.email,
        tags: [
          { name: 'type', value: 'application' },
          { name: 'event', value: 'recruiter_contacted' },
          { name: 'application_id', value: id },
        ],
      });

      // Update lastActivityAt
      application.lastActivityAt = new Date();
      await application.save();

      return NextResponse.json(
        {
          message: 'Contact email sent successfully',
        },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('Failed to send contact email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send contact email. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.error('[API /applications/[id]/contact] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

