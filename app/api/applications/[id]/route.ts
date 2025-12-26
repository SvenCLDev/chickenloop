import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getStatusChangedEmail } from '@/lib/emailTemplates';

// PATCH - Update application status (recruiters only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();
    const { id } = await params;

    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses = ['new', 'contacted', 'interviewed', 'offered', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Find application and verify it belongs to this recruiter
    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify recruiter owns this application
    if (application.recruiterId.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent changing status of withdrawn applications
    if (application.status === 'withdrawn') {
      return NextResponse.json(
        { error: 'Cannot change status of a withdrawn application. Withdrawn applications cannot be modified.' },
        { status: 400 }
      );
    }

    // Store old status for email notification
    const oldStatus = application.status;

    // Update status
    application.status = status;
    
    // Update lastActivityAt only if status actually changed
    if (oldStatus !== status) {
      application.lastActivityAt = new Date();
      
      // Set withdrawnAt timestamp when status changes to withdrawn
      if (status === 'withdrawn') {
        application.withdrawnAt = new Date();
      }
    }
    
    await application.save();

    // Populate for response
    await application.populate('jobId', 'title company location');
    await application.populate('candidateId', 'name email');

    // Send email notification to candidate if status changed (non-blocking)
    if (oldStatus !== status) {
      try {
        const candidate = await User.findById(application.candidateId).select('name email');
        const recruiter = await User.findById(application.recruiterId).select('name email');
        
        if (candidate && recruiter && candidate.email) {
          const job = application.jobId ? await Job.findById(application.jobId).select('title company location') : null;

          const emailTemplate = getStatusChangedEmail({
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            recruiterName: recruiter.name,
            recruiterEmail: recruiter.email,
            jobTitle: job?.title,
            jobCompany: job?.company,
            status: status,
          });

          await sendEmail({
            to: candidate.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            replyTo: recruiter.email,
            tags: [
              { name: 'type', value: 'application' },
              { name: 'event', value: 'status_changed' },
              { name: 'status', value: status },
            ],
          });
        }
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error('Failed to send status change notification email:', emailError);
      }
    }

    return NextResponse.json(
      {
        message: 'Application status updated successfully',
        application,
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
    
    console.error('[API /applications/[id] PATCH] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

