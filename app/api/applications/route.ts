import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { requireRole, requireAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getCandidateAppliedEmail, getRecruiterContactedEmail } from '@/lib/emailTemplates';
import { guardAgainstRecruiterNotesLeak } from '@/lib/applicationUtils';

// GET - Get applications
// For job seekers: Check if user has applied to a specific job (requires jobId query param)
// For recruiters: Get all applications for the recruiter (grouped by job)
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    // If jobId is provided, check if user (job seeker) has applied
    if (jobId) {
      const application = await Application.findOne({
        jobId: jobId,
        candidateId: user.userId,
      });

      // Format response - exclude recruiter-only fields for job seekers
      let formattedApplication = null;
      if (application) {
        formattedApplication = {
          _id: application._id,
          status: application.status,
          appliedAt: application.appliedAt,
          lastActivityAt: application.lastActivityAt,
          withdrawnAt: application.withdrawnAt,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        };
        // Explicitly exclude recruiterNotes and internalNotes
        // These fields are never returned to job seekers
      }

      // Server-side guard to prevent recruiterNotes leak
      guardAgainstRecruiterNotesLeak({ hasApplied: !!application, application: formattedApplication }, user.role);

      return NextResponse.json(
        {
          hasApplied: !!application,
          application: formattedApplication,
        },
        { status: 200 }
      );
    }

    // If no jobId, recruiter wants all their applications
    // Exclude applications archived by the recruiter
    if (user.role === 'recruiter') {
      const applications = await Application.find({
        recruiterId: user.userId,
        archivedByRecruiter: { $ne: true },
      })
        .populate('jobId', 'title company city')
        .populate('candidateId', 'name email')
        .sort({ appliedAt: -1 })
        .lean();

      return NextResponse.json(
        {
          applications,
        },
        { status: 200 }
      );
    }

    // For job seekers without jobId, return error
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.error('[API /applications GET] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new application
// For job seekers: Create job application (requires jobId, status='new')
// For recruiters: Contact candidate (candidateId required, jobId optional, status='contacted')
export async function POST(request: NextRequest) {
  let user: any = null;
  try {
    user = requireAuth(request);
    await connectDB();

    const { jobId, candidateId } = await request.json();

    // Job seeker applying to a job
    if (user.role === 'job-seeker') {
      if (!jobId) {
        return NextResponse.json(
          { error: 'Job ID is required' },
          { status: 400 }
        );
      }

      // Verify job exists and get recruiter ID
      const job = await Job.findById(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      // Check if job is published
      if (job.published === false) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      const recruiterId = job.recruiter;
      if (!recruiterId) {
        return NextResponse.json(
          { error: 'Job has no recruiter assigned' },
          { status: 400 }
        );
      }

      // Check for duplicate application
      const existingApplication = await Application.findOne({
        jobId: jobId,
        candidateId: user.userId,
      });

      if (existingApplication) {
        return NextResponse.json(
          { error: 'You have already applied to this job' },
          { status: 400 }
        );
      }

      // Create new application
      const now = new Date();
      const application = await Application.create({
        jobId: jobId,
        recruiterId: recruiterId,
        candidateId: user.userId,
        status: 'new',
        appliedAt: now,
        lastActivityAt: now,
      });

      // Send email notification to recruiter (non-blocking)
      try {
        const candidate = await User.findById(user.userId).select('name email');
        const recruiter = await User.findById(recruiterId).select('name email');
        
        if (candidate && recruiter && recruiter.email) {
          const emailTemplate = getCandidateAppliedEmail({
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            recruiterName: recruiter.name,
            recruiterEmail: recruiter.email,
            jobTitle: job.title,
            jobCompany: job.company,
            jobCity: job.city,
            applicationDate: now,
          });

          await sendEmail({
            to: recruiter.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            tags: [
              { name: 'type', value: 'application' },
              { name: 'event', value: 'candidate_applied' },
            ],
          });
        }
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error('Failed to send application notification email:', emailError);
      }

      return NextResponse.json(
        {
          message: 'Application submitted successfully',
          application,
        },
        { status: 201 }
      );
    }

    // Recruiter contacting a candidate
    if (user.role === 'recruiter' || user.role === 'admin') {
      if (!candidateId) {
        return NextResponse.json(
          { error: 'Candidate ID is required' },
          { status: 400 }
        );
      }

      // Verify candidate exists (check if CV exists for this user)
      const CV = (await import('@/models/CV')).default;
      const cv = await CV.findOne({ jobSeeker: candidateId });
      if (!cv) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        );
      }

      // If jobId not provided, check recruiter's published jobs
      let finalJobId: string | null = jobId || null;
      if (!finalJobId) {
        const publishedJobs = await Job.find({
          recruiter: user.userId,
          published: true,
        }).select('_id title company city');

        if (publishedJobs.length === 0) {
          return NextResponse.json(
            { error: 'You need at least one published job to contact candidates' },
            { status: 400 }
          );
        }

        // If only one published job, auto-assign it
        if (publishedJobs.length === 1) {
          finalJobId = String(publishedJobs[0]._id);
        } else {
          // Multiple jobs - return them so frontend can show selection modal
          return NextResponse.json(
            {
              error: 'Please select a job',
              jobs: publishedJobs.map((job) => ({
                _id: String(job._id),
                title: job.title,
                company: job.company,
                city: job.city,
              })),
            },
            { status: 400 }
          );
        }
      }

      // Verify jobId if provided
      if (finalJobId) {
        const job = await Job.findById(finalJobId);
        if (!job) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        // Verify recruiter owns the job
        if (job.recruiter.toString() !== user.userId) {
          return NextResponse.json(
            { error: 'You do not own this job' },
            { status: 403 }
          );
        }
      }

      // Check for duplicate contact (recruiter + candidate, regardless of jobId)
      const existingContact = await Application.findOne({
        recruiterId: user.userId,
        candidateId: candidateId,
      });

      if (existingContact) {
        return NextResponse.json(
          { error: 'You have already contacted this candidate' },
          { status: 400 }
        );
      }

      // Create new contact application
      const now = new Date();
      const applicationData: any = {
        recruiterId: user.userId,
        candidateId: candidateId,
        status: 'contacted',
        appliedAt: now,
        lastActivityAt: now,
      };
      
      // Only include jobId if it exists
      if (finalJobId) {
        applicationData.jobId = finalJobId;
      }
      
      const application = await Application.create(applicationData);

      // Send email notification to candidate (non-blocking)
      try {
        const candidate = await User.findById(candidateId).select('name email');
        const recruiter = await User.findById(user.userId).select('name email');
        
        if (candidate && recruiter && candidate.email) {
          let jobTitle: string | undefined;
          let jobCompany: string | undefined;
          let jobCity: string | undefined;

          if (finalJobId) {
            const job = await Job.findById(finalJobId).select('title company city');
            if (job) {
              jobTitle = job.title;
              jobCompany = job.company;
              jobCity = job.city;
            }
          }

          const emailTemplate = getRecruiterContactedEmail({
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            recruiterName: recruiter.name,
            recruiterEmail: recruiter.email,
            jobTitle,
            jobCompany,
            jobCity,
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
            ],
          });
        }
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error('Failed to send recruiter contact notification email:', emailError);
      }

      return NextResponse.json(
        {
          message: 'Candidate contacted successfully',
          application,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle duplicate key error (from unique index)
    if (errorMessage.includes('duplicate key') || errorMessage.includes('E11000')) {
      // Determine error message based on user role, not error message content
      // Try to get user if not already available
      if (!user) {
        try {
          user = requireAuth(request);
        } catch {
          // If we can't get user, default to job application error (more common case)
          return NextResponse.json(
            { error: 'You have already applied to this job' },
            { status: 400 }
          );
        }
      }
      
      if (user && (user.role === 'recruiter' || user.role === 'admin')) {
        return NextResponse.json(
          { error: 'You have already contacted this candidate' },
          { status: 400 }
        );
      } else {
        // Job seeker duplicate application
        return NextResponse.json(
          { error: 'You have already applied to this job' },
          { status: 400 }
        );
      }
    }

    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.error('[API /applications] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

