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
import { validateTransition, ApplicationStatus, TERMINAL_STATES } from '@/lib/applicationStatusTransitions';

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
    if (user.role === 'admin') {
      // Admins can access all applications
      // No restriction needed
    } else if (user.role === 'recruiter') {
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

    // Update viewedAt and status for recruiters only (not admins or job seekers)
    // Only update if viewedAt is null (first time viewing)
    // When recruiter first views an application, update status from 'applied' to 'viewed'
    if (user.role === 'recruiter' && !application.viewedAt) {
      application.viewedAt = new Date();
      // Update status to 'viewed' if it's currently 'applied' (automatic status transition)
      // Use centralized transition validation to ensure this is allowed
      const currentStatus = application.status as ApplicationStatus;
      if (currentStatus === 'applied') {
        const transitionError = validateTransition('applied', 'viewed');
        if (!transitionError) {
          application.status = 'viewed';
        } else {
          // Log warning but don't fail - this should never happen for applied -> viewed
          console.warn(`[API /applications/[id] GET] Unexpected transition error: ${transitionError}`);
        }
      }
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
      coverNote: application.coverNote,
      published: application.published,
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
      // Admins always have access to all notes and admin-specific fields
      response.internalNotes = application.internalNotes;
      response.recruiterNotes = application.recruiterNotes;
      response.adminNotes = application.adminNotes;
      response.archivedByAdmin = application.archivedByAdmin || false;
      response.adminActions = application.adminActions || [];
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

  // PATCH - Update application status and/or recruiterNotes (recruiters and admins)
  export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const user = requireRole(request, ['recruiter', 'admin']);
      await connectDB();
      const { id } = await params;

      const body = await request.json();
      const { status, recruiterNotes, adminNotes, published } = body;

      // At least one field must be provided
    if (status === undefined && recruiterNotes === undefined && adminNotes === undefined && published === undefined) {
      return NextResponse.json(
        { error: 'Either status, recruiterNotes, adminNotes, or published must be provided' },
        { status: 400 }
      );
    }

    // Find application
    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify access: Admins can access all, recruiters can only access their own
    if (user.role === 'recruiter') {
      if (application.recruiterId.toString() !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    // Admins have full access, no restriction needed

    // Store old status for email notification
    const oldStatus = application.status;
    let statusChanged = false;

    // Update status if provided
    if (status !== undefined) {
      // Validate status is a valid ApplicationStatus
      const validStatuses: ApplicationStatus[] = [
        'applied', 'viewed', 'contacted', 'interviewing', 'offered', 'hired',
        'accepted', 'rejected', 'withdrawn'
      ];
      
      if (!validStatuses.includes(status as ApplicationStatus)) {
        return NextResponse.json(
          { error: `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      // Authorization: Only recruiters can set accepted/rejected/hired status
      // Only job seekers can set withdrawn status (enforced in withdraw endpoint)
      // Prevent recruiters from setting withdrawn status (job seekers must use withdraw endpoint)
      if (status === 'withdrawn') {
        return NextResponse.json(
          { error: 'Cannot set status to withdrawn via this endpoint. Job seekers must use the withdraw endpoint.' },
          { status: 400 }
        );
      }

      // Validate status transition using centralized transition rules
      const currentStatus = application.status as ApplicationStatus;
      const newStatus = status as ApplicationStatus;
      
      const transitionError = validateTransition(currentStatus, newStatus);
      if (transitionError) {
        return NextResponse.json(
          { error: transitionError },
          { status: 400 }
        );
      }

      // Additional check: Prevent changing status from any terminal state
      if (TERMINAL_STATES.includes(currentStatus) && currentStatus !== newStatus) {
        return NextResponse.json(
          { error: `Cannot change status from "${currentStatus}". Applications in terminal states (${TERMINAL_STATES.join(', ')}) cannot be modified.` },
          { status: 400 }
        );
      }

      application.status = newStatus;
      statusChanged = oldStatus !== newStatus;
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

    // Update adminNotes if provided (admin only)
    if (adminNotes !== undefined) {
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can update adminNotes' },
          { status: 403 }
        );
      }

      // Validate adminNotes is a string
      if (typeof adminNotes !== 'string') {
        return NextResponse.json(
          { error: 'adminNotes must be a string' },
          { status: 400 }
        );
      }
      application.adminNotes = adminNotes;
    }

    // Update published if provided (recruiters and admins only)
    if (published !== undefined) {
      // Validate published is a boolean
      if (typeof published !== 'boolean') {
        return NextResponse.json(
          { error: 'published must be a boolean' },
          { status: 400 }
        );
      }
      application.published = published;
      // Note: Updating published does NOT trigger email notifications or status changes
    }
    
    // Log admin actions
    if (user.role === 'admin') {
      const adminUser = await User.findById(user.userId).select('name').lean();
      const adminName = adminUser?.name || 'Unknown Admin';
      
      if (!application.adminActions) {
        application.adminActions = [];
      }

      if (statusChanged) {
        application.adminActions.push({
          adminId: user.userId as any,
          adminName,
          action: 'status_changed',
          details: `Status changed from "${oldStatus}" to "${application.status}"`,
          timestamp: new Date(),
        });
      }
      if (adminNotes !== undefined && adminNotes !== (application.adminNotes || '')) {
        application.adminActions.push({
          adminId: user.userId as any,
          adminName,
          action: 'admin_notes_updated',
          details: 'Admin notes updated',
          timestamp: new Date(),
        });
      }
    }
    
    // Update lastActivityAt if status changed or notes were updated
    // Note: published changes do NOT update lastActivityAt (it's a visibility toggle, not an activity)
    if (statusChanged || recruiterNotes !== undefined || adminNotes !== undefined) {
      application.lastActivityAt = new Date();
      
      // Set withdrawnAt timestamp when status changes to withdrawn
      if (statusChanged && application.status === 'withdrawn') {
        application.withdrawnAt = new Date();
      }
    }
    
    await application.save();

    // Populate for email notification (if needed)
    // Send email notification to candidate if status changed to specific statuses (non-blocking)
    // Only send emails for: contacted, interviewing, offered, rejected
    // Do NOT send emails for: viewed, applied, withdrawn, hired
    if (statusChanged) {
      const statusesToNotify = ['contacted', 'interviewing', 'offered', 'rejected'];
      const shouldSendEmail = statusesToNotify.includes(application.status);
      
      if (shouldSendEmail) {
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
                { name: 'status', value: application.status },
              ],
            });
          }
        } catch (emailError) {
          // Log but don't fail the request if email fails
          console.error('Failed to send status change notification email:', emailError);
        }
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
      coverNote: application.coverNote,
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
      published: application.published,
    };

    // Include admin fields for admins
    if (user.role === 'admin') {
      response.adminNotes = application.adminNotes;
      response.archivedByAdmin = application.archivedByAdmin || false;
      response.adminActions = application.adminActions || [];
    }

    // Include notesEnabled flag for recruiters
    if (user.role === 'recruiter') {
      const recruiterUser = await User.findById(user.userId).select('notesEnabled').lean();
      response.notesEnabled = recruiterUser?.notesEnabled !== false; // Default to true if not set
    } else if (user.role === 'admin') {
      response.notesEnabled = true; // Admins always have notes enabled
    }

    // Determine success message
    let message = 'Application updated successfully';
    if (statusChanged && recruiterNotes !== undefined && adminNotes !== undefined) {
      message = 'Application status and notes updated successfully';
    } else if (statusChanged && (recruiterNotes !== undefined || adminNotes !== undefined)) {
      message = 'Application status and notes updated successfully';
    } else if (statusChanged) {
      message = 'Application status updated successfully';
    } else if (recruiterNotes !== undefined) {
      message = 'Application notes updated successfully';
    } else if (adminNotes !== undefined) {
      message = 'Admin notes updated successfully';
    } else if (published !== undefined) {
      message = published ? 'Application published successfully' : 'Application removed successfully';
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

