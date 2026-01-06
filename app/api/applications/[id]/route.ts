import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import Company from '@/models/Company';
import CV from '@/models/CV';
import { requireAuth } from '@/lib/auth';
import { requireRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getStatusChangedEmail } from '@/lib/emailTemplates';
import { sanitizeApplicationForRole, guardAgainstRecruiterNotesLeak } from '@/lib/applicationUtils';

// GET - Get a single application by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    await connectDB();
    const { id } = await params;

    // Find application
    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Role-based access control
    if (user.role === 'recruiter' || user.role === 'admin') {
      // Recruiters can only access applications for their jobs
      if (application.recruiterId.toString() !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'job-seeker') {
      // Job seekers can only access their own applications
      if (application.candidateId.toString() !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update viewedAt for recruiters only (not admins or job seekers)
    // Only update if viewedAt is null (first time viewing)
    if (user.role === 'recruiter' && !application.viewedAt) {
      application.viewedAt = new Date();
      await application.save();
    }

    // Populate related data
    await application.populate('jobId', 'title description company city country type recruiter companyId createdAt');
    await application.populate('candidateId', 'name email');
    await application.populate('recruiterId', 'name email');

    // Get company data if job has companyId
    let companyData = null;
    if (application.jobId && (application.jobId as any).companyId) {
      const company = await Company.findById((application.jobId as any).companyId).select('name description address website logo').lean();
      if (company) {
        companyData = company;
      }
    }

    // Get CV data for the candidate (for recruiters)
    let cvData = null;
    if (user.role === 'recruiter' || user.role === 'admin') {
      const cv = await CV.findOne({ jobSeeker: application.candidateId }).select('_id fullName summary experienceAndSkill languages lookingForWorkInAreas professionalCertifications').lean();
      if (cv) {
        cvData = {
          _id: cv._id,
          fullName: cv.fullName,
          summary: cv.summary,
          experienceAndSkill: cv.experienceAndSkill,
          languages: cv.languages,
          lookingForWorkInAreas: cv.lookingForWorkInAreas,
          professionalCertifications: cv.professionalCertifications,
        };
      }
    }

    // Format response
    const response: any = {
      _id: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
      lastActivityAt: application.lastActivityAt,
      withdrawnAt: application.withdrawnAt,
      viewedAt: application.viewedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      job: application.jobId ? {
        _id: (application.jobId as any)._id,
        title: (application.jobId as any).title,
        description: (application.jobId as any).description,
        company: (application.jobId as any).company,
        city: (application.jobId as any).city,
        country: (application.jobId as any).country,
        type: (application.jobId as any).type,
        createdAt: (application.jobId as any).createdAt,
      } : null,
      company: companyData,
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
      cv: cvData,
    };

    // Include internalNotes and recruiterNotes only for recruiters with feature enabled
    if (user.role === 'admin') {
      // Admins always have access
      response.internalNotes = application.internalNotes;
      response.recruiterNotes = application.recruiterNotes;
      response.notesEnabled = true; // Admins always have notes enabled
    } else if (user.role === 'recruiter') {
      // Check if notes feature is enabled for this recruiter
      const recruiterUser = await User.findById(user.userId).select('notesEnabled').lean();
      const notesEnabled = recruiterUser?.notesEnabled !== false; // Default to true if not set
      
      if (notesEnabled) {
        response.internalNotes = application.internalNotes;
        response.recruiterNotes = application.recruiterNotes;
        response.notesEnabled = true;
      } else {
        // Feature disabled for this recruiter
        response.internalNotes = undefined;
        response.recruiterNotes = undefined;
        response.notesEnabled = false; // Signal to frontend that feature is disabled
      }
    } else {
      // For job seekers, explicitly ensure recruiterNotes is not included
      // This is a server-side guard
      delete response.recruiterNotes;
      delete response.internalNotes;
      // Don't expose notesEnabled flag to job seekers
    }

    // Server-side guard to prevent recruiterNotes leak
    guardAgainstRecruiterNotesLeak(response, user.role);

    return NextResponse.json(
      {
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
    
    console.error('[API /applications/[id] GET] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

  // PATCH - Update application status and/or recruiterNotes (recruiters only)
  export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const user = requireRole(request, ['recruiter']);
      await connectDB();
      const { id } = await params;

      const body = await request.json();
      const { status, recruiterNotes } = body;

      // At least one field must be provided
    if (status === undefined && recruiterNotes === undefined) {
      return NextResponse.json(
        { error: 'Either status or recruiterNotes must be provided' },
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

    // Store old status for email notification
    const oldStatus = application.status;
    let statusChanged = false;

    // Update status if provided
    if (status !== undefined) {
      // Validate status enum
      const validStatuses = ['new', 'contacted', 'interviewed', 'offered', 'rejected', 'withdrawn'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
          { status: 400 }
        );
      }

      // Prevent changing status of withdrawn applications
      if (application.status === 'withdrawn' && status !== 'withdrawn') {
        return NextResponse.json(
          { error: 'Cannot change status of a withdrawn application. Withdrawn applications cannot be modified.' },
          { status: 400 }
        );
      }

      application.status = status;
      statusChanged = oldStatus !== status;
    }

    // Update recruiterNotes if provided
    if (recruiterNotes !== undefined) {
      // Check if notes feature is enabled for this recruiter
      const recruiterUser = await User.findById(user.userId).select('notesEnabled').lean();
      const notesEnabled = recruiterUser?.notesEnabled !== false; // Default to true if not set
      
      if (!notesEnabled) {
        return NextResponse.json(
          { error: 'Internal notes feature is not available for your account. Please contact support to enable this feature.' },
          { status: 403 }
        );
      }

      // Validate recruiterNotes is a string
      if (typeof recruiterNotes !== 'string') {
        return NextResponse.json(
          { error: 'recruiterNotes must be a string' },
          { status: 400 }
        );
      }
      application.recruiterNotes = recruiterNotes;
    }
    
    // Update lastActivityAt if status changed or notes were updated
    if (statusChanged || recruiterNotes !== undefined) {
      application.lastActivityAt = new Date();
      
      // Set withdrawnAt timestamp when status changes to withdrawn
      if (statusChanged && application.status === 'withdrawn') {
        application.withdrawnAt = new Date();
      }
    }
    
    await application.save();

    // Populate for email notification (if needed)
    // Send email notification to candidate if status changed (non-blocking)
    if (statusChanged) {
      try {
        const candidate = await User.findById(application.candidateId).select('name email');
        const recruiter = await User.findById(application.recruiterId).select('name email');
        
        if (candidate && recruiter && candidate.email) {
          const job = application.jobId ? await Job.findById(application.jobId).select('title company city') : null;

          const emailTemplate = getStatusChangedEmail({
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            recruiterName: recruiter.name,
            recruiterEmail: recruiter.email,
            jobTitle: job?.title,
            jobCompany: job?.company,
            status: application.status,
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

    // Populate related data for response
    await application.populate('jobId', 'title company city');
    await application.populate('candidateId', 'name email');
    await application.populate('recruiterId', 'name email');

    // Format response with recruiter-only fields
    const response: any = {
      _id: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
      lastActivityAt: application.lastActivityAt,
      withdrawnAt: application.withdrawnAt,
      viewedAt: application.viewedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      job: application.jobId ? {
        _id: (application.jobId as any)._id,
        title: (application.jobId as any).title,
        company: (application.jobId as any).company,
        city: (application.jobId as any).city,
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
      internalNotes: application.internalNotes,
      recruiterNotes: application.recruiterNotes,
    };

    // Include notesEnabled flag for recruiters
    const recruiterUser = await User.findById(user.userId).select('notesEnabled').lean();
    response.notesEnabled = recruiterUser?.notesEnabled !== false; // Default to true if not set

    // Determine success message
    let message = 'Application updated successfully';
    if (statusChanged && recruiterNotes !== undefined) {
      message = 'Application status and notes updated successfully';
    } else if (statusChanged) {
      message = 'Application status updated successfully';
    } else if (recruiterNotes !== undefined) {
      message = 'Application notes updated successfully';
    }

    return NextResponse.json(
      {
        message,
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
    
    console.error('[API /applications/[id] PATCH] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

