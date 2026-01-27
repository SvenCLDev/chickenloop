import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { requireRole, requireAuth } from '@/lib/auth';
import { sendEmailAsync, EmailCategory } from '@/lib/email';
import { getCandidateAppliedEmail, getRecruiterContactedEmail } from '@/lib/emailTemplates';
import { guardAgainstRecruiterNotesLeak } from '@/lib/applicationUtils';
import mongoose from 'mongoose';

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
      // Convert jobId to ObjectId for proper type matching
      // Exclude archived applications from the check
      // IMPORTANT: Must match exact jobId (not null) - only applications for this specific job
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return NextResponse.json(
          { error: 'Invalid job ID' },
          { status: 400 }
        );
      }
      
      const jobObjectId = new mongoose.Types.ObjectId(jobId);
      const candidateObjectId = mongoose.Types.ObjectId.isValid(user.userId) ? new mongoose.Types.ObjectId(user.userId) : user.userId;
      
      // Debug logging
      console.log('[API /applications GET] Checking for application:', {
        jobId,
        jobObjectId: jobObjectId.toString(),
        candidateId: user.userId,
        candidateObjectId: candidateObjectId.toString(),
      });
      
      // Query with explicit jobId match - Mongoose will handle type conversion
      // This query will ONLY match documents where jobId equals this exact ObjectId (not null)
      const application = await Application.findOne({
        jobId: jobObjectId,
        candidateId: candidateObjectId,
        archivedByJobSeeker: { $ne: true }, // Exclude archived applications
      }).lean(); // Use lean() for better performance and to avoid Mongoose document issues

      // Debug logging for found application
      if (application) {
        console.log('[API /applications GET] Found application:', {
          applicationId: application._id?.toString(),
          jobId: application.jobId?.toString(),
          jobIdType: application.jobId ? typeof application.jobId : 'null/undefined',
          candidateId: application.candidateId?.toString(),
          archivedByJobSeeker: application.archivedByJobSeeker,
          status: application.status,
        });
      } else {
        console.log('[API /applications GET] No application found');
      }

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
        // NOTE: Do NOT include application.published - it only controls dashboard visibility
      }

      // Server-side guard to prevent recruiterNotes leak
      guardAgainstRecruiterNotesLeak({ hasApplied: !!application, application: formattedApplication }, user.role);

      return NextResponse.json(
        {
          hasApplied: !!application,
          application: formattedApplication,
          applicationStatus: application?.status || null, // Include status for button visibility logic
        },
        { status: 200 }
      );
    }

    // If no jobId, recruiter wants all their applications
    // Exclude applications archived by the recruiter
    // Only return published applications (published !== false)
    if (user.role === 'recruiter') {
      const applications = await Application.find({
        recruiterId: user.userId,
        archivedByRecruiter: { $ne: true },
        published: { $ne: false },
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
// For job seekers: Create job application (requires jobId, status='applied')
// For recruiters: Contact candidate (candidateId required, jobId optional, status='contacted')
//                 NOTE: Recruiter contact MUST use "contacted" status, NOT "applied"
export async function POST(request: NextRequest) {
  let user: any = null;
  try {
    user = requireAuth(request);
    await connectDB();

    const { jobId, candidateId, coverNote } = await request.json();
    
    // Validate and sanitize coverNote if provided
    let sanitizedCoverNote: string | undefined = undefined;
    if (coverNote !== undefined && coverNote !== null) {
      // Must be a string
      if (typeof coverNote !== 'string') {
        return NextResponse.json(
          { error: 'coverNote must be a string' },
          { status: 400 }
        );
      }
      
      // Trim whitespace
      sanitizedCoverNote = coverNote.trim();
      
      // Check max length (300 characters)
      if (sanitizedCoverNote.length > 300) {
        return NextResponse.json(
          { error: 'coverNote must not exceed 300 characters' },
          { status: 400 }
        );
      }
      
      // Strip HTML tags to prevent XSS
      sanitizedCoverNote = sanitizedCoverNote.replace(/<[^>]*>/g, '');
      
      // If after sanitization it's empty, set to undefined
      if (sanitizedCoverNote.length === 0) {
        sanitizedCoverNote = undefined;
      }
    }

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
      // Exclude archived applications from the duplicate check
      // Use consistent ObjectId conversion for both the check and the create
      // IMPORTANT: Must match exact jobId (not null) - only applications for this specific job
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return NextResponse.json(
          { error: 'Invalid job ID' },
          { status: 400 }
        );
      }
      
      const jobObjectId = new mongoose.Types.ObjectId(jobId);
      const candidateObjectId = mongoose.Types.ObjectId.isValid(user.userId) ? new mongoose.Types.ObjectId(user.userId) : user.userId;
      
      // Debug logging before query
      console.log('[API /applications POST] Checking for duplicate application:', {
        jobId,
        jobObjectId: jobObjectId.toString(),
        candidateId: user.userId,
        candidateObjectId: candidateObjectId.toString(),
      });
      
      // Query will ONLY match documents where jobId equals this exact ObjectId (not null)
      const existingApplication = await Application.findOne({
        jobId: jobObjectId,
        candidateId: candidateObjectId,
        archivedByJobSeeker: { $ne: true },
      }).lean();

      if (existingApplication) {
        // Debug logging to help identify why this application was found
        console.log('[API /applications POST] Found existing application:', {
          applicationId: existingApplication._id?.toString(),
          jobId: existingApplication.jobId?.toString(),
          jobIdType: existingApplication.jobId ? typeof existingApplication.jobId : 'null/undefined',
          jobIdClass: existingApplication.jobId ? existingApplication.jobId.constructor.name : 'null/undefined',
          candidateId: existingApplication.candidateId?.toString(),
          candidateIdType: existingApplication.candidateId ? typeof existingApplication.candidateId : 'null/undefined',
          archivedByJobSeeker: existingApplication.archivedByJobSeeker,
          status: existingApplication.status,
        });
        
        // Also try a direct database query to see all applications for this user
        const db = mongoose.connection.db;
        if (db) {
          const allUserApplications = await db.collection('applications').find({
            candidateId: candidateObjectId,
          }).toArray();
          console.log('[API /applications POST] All applications for this candidate:', {
            count: allUserApplications.length,
            applications: allUserApplications.map((app: any) => ({
              _id: app._id?.toString(),
              jobId: app.jobId?.toString() || 'null',
              candidateId: app.candidateId?.toString(),
              archivedByJobSeeker: app.archivedByJobSeeker,
              status: app.status,
            })),
          });
        }
        
        return NextResponse.json(
          { error: 'You have already applied to this job' },
          { status: 400 }
        );
      } else {
        console.log('[API /applications POST] No existing application found with jobId, checking recruiterId+candidateId...');
      }

      // Declare application variable early so we can assign to it in different branches
      let application: any = null;
      const now = new Date();

      // Check if there's a general contact (jobId is null) from this recruiter
      // This is different from a job-specific application - it's when a recruiter contacts
      // a candidate without a specific job in mind
      const generalContact = await Application.findOne({
        recruiterId: recruiterId,
        candidateId: candidateObjectId,
        jobId: null,
        archivedByJobSeeker: { $ne: true },
      }).lean();

      if (generalContact) {
        // There's a general contact without a specific job - we can update it to link this job
        // This is the only case where we update instead of create (since general contacts
        // don't have a jobId and the unique index on recruiterId + candidateId prevents duplicates)
        console.log('[API /applications POST] Found existing general contact, updating to link this job...');
        const app = await Application.findById(generalContact._id);
        if (app) {
          app.jobId = jobObjectId;
          app.appliedAt = new Date();
          app.lastActivityAt = new Date();
          app.status = 'applied';
          app.archivedByJobSeeker = false; // Ensure it's not archived
          // Update coverNote if provided
          if (sanitizedCoverNote !== undefined) {
            app.coverNote = sanitizedCoverNote;
          }
          await app.save();
          application = app;
          console.log('[API /applications POST] Updated general contact to link job');
        } else {
          // This shouldn't happen, but handle it just in case
          console.error('[API /applications POST] Could not find general contact to update:', generalContact._id);
          return NextResponse.json(
            { error: 'An error occurred. Please try again.' },
            { status: 500 }
          );
        }
      }

      // If we already have an application from the above logic (general contact update), skip creating a new one
      if (!application) {
        // Also check if there's an archived application for this specific job
        // If found, we should restore it rather than create a duplicate
        const archivedApplication = await Application.findOne({
          jobId: jobObjectId,
          candidateId: candidateObjectId,
          archivedByJobSeeker: true,
        });

        if (archivedApplication) {
          // Restore the archived application instead of creating a new one
          archivedApplication.archivedByJobSeeker = false;
          archivedApplication.status = 'applied';
          archivedApplication.appliedAt = now;
          archivedApplication.lastActivityAt = now;
          archivedApplication.withdrawnAt = undefined;
          // Update coverNote if provided
          if (sanitizedCoverNote !== undefined) {
            archivedApplication.coverNote = sanitizedCoverNote;
          }
          await archivedApplication.save();
          application = archivedApplication;
          console.log('[API /applications POST] Restored archived application');
        } else {
          // Create new application
          // With the partial unique index, we can now create multiple applications
          // from the same recruiter to the same candidate for different jobs
          console.log('[API /applications POST] Creating new application...');
          const applicationData: any = {
            jobId: jobObjectId,
            recruiterId: recruiterId,
            candidateId: candidateObjectId,
            status: 'applied',
            appliedAt: now,
            lastActivityAt: now,
          };
          // Only include coverNote if provided
          if (sanitizedCoverNote !== undefined) {
            applicationData.coverNote = sanitizedCoverNote;
          }
          application = await Application.create(applicationData);
          console.log('[API /applications POST] Application created successfully:', {
            applicationId: application._id?.toString(),
          });
        }
      }

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

          // Send email asynchronously (fire-and-forget)
          sendEmailAsync({
            to: recruiter.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            category: EmailCategory.IMPORTANT_TRANSACTIONAL,
            eventType: 'candidate_applied',
            userId: typeof recruiterId === 'object' ? recruiterId.toString() : String(recruiterId),
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

    // ============================================================================
    // RECRUITER CONTACTING A CANDIDATE
    // ============================================================================
    // 
    // This flow handles when a recruiter initiates contact with a candidate.
    // 
    // STATUS ASSIGNMENT RULE (CRITICAL):
    // - Status MUST be "contacted" (NOT "applied")
    // - "applied" = candidate-initiated action (candidate applied to job)
    // - "contacted" = recruiter-initiated action (recruiter reached out to candidate)
    // 
    // This distinction is important for:
    // - ATS workflow accuracy (who initiated the contact?)
    // - Status transitions (contacted → interviewing → offered → hired)
    // - Reporting and analytics (recruiter outreach vs candidate applications)
    //
    // SAFEGUARD: Runtime assertions prevent accidental use of "applied" status.
    // ============================================================================
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

      // Check for existing application (recruiter + candidate, regardless of jobId)
      const existingContact = await Application.findOne({
        recruiterId: user.userId,
        candidateId: candidateId,
      });

      if (existingContact) {
        // If application already exists, check if we should update it
        // Do NOT downgrade or overwrite a more advanced status
        const { getStatusPriority } = await import('@/lib/applicationStatusPriority');
        const currentPriority = getStatusPriority(existingContact.status as any);
        const contactedPriority = getStatusPriority('contacted');
        
        // If current status is more advanced than "contacted", don't modify
        if (currentPriority > contactedPriority) {
          return NextResponse.json(
            { error: 'You have already contacted this candidate' },
            { status: 400 }
          );
        }
        
        // If current status is terminal (rejected, withdrawn, hired), don't modify
        const { TERMINAL_STATES } = await import('@/lib/domainTypes');
        if (TERMINAL_STATES.includes(existingContact.status as any)) {
          return NextResponse.json(
            { error: 'You have already contacted this candidate' },
            { status: 400 }
          );
        }
        
        // Application exists but status is less advanced or equal - update to "contacted"
        // 
        // IMPORTANT: Status must be "contacted" (NOT "applied") for recruiter-initiated contact.
        // See rationale in the new application creation section above.
        const wasAlreadyContacted = existingContact.status === 'contacted';
        existingContact.status = 'contacted'; // MUST be "contacted" for recruiter-initiated contact
        existingContact.lastActivityAt = new Date();
        
        // Runtime safeguard: Assert that status is NOT "applied" to prevent accidental regression
        if (existingContact.status === 'applied') {
          throw new Error('CRITICAL: Status must be "contacted" for recruiter-initiated contact, not "applied". This indicates a code error.');
        }
        // Update jobId if provided and not already set
        if (finalJobId && !existingContact.jobId) {
          existingContact.jobId = finalJobId;
        }
        await existingContact.save();
        
        // Send email notification if status was updated (not already "contacted")
        if (!wasAlreadyContacted) {
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

              // Send email asynchronously (fire-and-forget)
              sendEmailAsync({
                to: candidate.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text,
                replyTo: recruiter.email,
                category: EmailCategory.IMPORTANT_TRANSACTIONAL,
                eventType: 'recruiter_contacted',
                userId: user.userId.toString(),
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
        }
        
        // Return success with updated application
        return NextResponse.json(
          {
            message: 'Candidate contacted successfully',
            application: existingContact,
          },
          { status: 200 }
        );
      }

      // Create new contact application with status "contacted"
      // 
      // IMPORTANT: Status must be "contacted" (NOT "applied") for recruiter-initiated contact.
      // 
      // Rationale:
      // - "applied" status indicates a candidate-initiated action (candidate applied to a job)
      // - "contacted" status indicates a recruiter-initiated action (recruiter reached out to candidate)
      // - Using "applied" here would incorrectly represent the workflow state and confuse the ATS
      // - The status reflects WHO initiated the contact: candidate = "applied", recruiter = "contacted"
      //
      // SAFEGUARD: Do NOT use "applied" status in this recruiter contact flow.
      // If you need to change this, ensure it aligns with the ATS workflow semantics.
      const now = new Date();
      const applicationData: any = {
        recruiterId: user.userId,
        candidateId: candidateId,
        status: 'contacted', // MUST be "contacted" for recruiter-initiated contact (see comment above)
        appliedAt: now,
        lastActivityAt: now,
      };
      
      // Runtime safeguard: Assert that status is NOT "applied" to prevent accidental regression
      if (applicationData.status === 'applied') {
        throw new Error('CRITICAL: Status must be "contacted" for recruiter-initiated contact, not "applied". This indicates a code error.');
      }
      
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

          // Send email asynchronously (fire-and-forget)
          sendEmailAsync({
            to: candidate.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            replyTo: recruiter.email,
            category: EmailCategory.IMPORTANT_TRANSACTIONAL,
            eventType: 'recruiter_contacted',
            userId: user.userId.toString(),
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

