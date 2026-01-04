import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import { requireRole } from '@/lib/auth';
import { createDeleteAuditLog } from '@/lib/audit';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';

// GET - Get a single job (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const job = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate('companyId', 'name');

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

// PUT - Update a job (admin only, can edit any job)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const job = await Job.findById(id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { title, description, location, country, salary, type, company, languages, qualifications, sports, occupationalAreas, pictures, spam, published, featured, applyByEmail, applyByWebsite, applicationEmail, applicationWebsite } = await request.json();

    if (title) job.title = title;
    if (description) job.description = description;
    if (location) job.location = location;
    if (country !== undefined) job.country = country?.trim().toUpperCase() || undefined;
    if (salary !== undefined) job.salary = salary;
    if (type) job.type = type;
    if (company) job.company = company;
    if (languages !== undefined) {
      if (Array.isArray(languages) && languages.length > 3) {
        return NextResponse.json(
          { error: 'Maximum 3 languages allowed' },
          { status: 400 }
        );
      }
      job.languages = languages || [];
    }
    if (qualifications !== undefined) {
      job.qualifications = qualifications || [];
    }
    if (sports !== undefined) {
      job.sports = sports || [];
    }
    if (occupationalAreas !== undefined) {
      // Validate job categories - ensure all categories are in JOB_CATEGORIES
      if (Array.isArray(occupationalAreas)) {
        const invalidCategories = occupationalAreas.filter(
          (category: string) => !JOB_CATEGORIES.includes(category as any)
        );
        if (invalidCategories.length > 0) {
          return NextResponse.json(
            { message: 'Invalid job category' },
            { status: 400 }
          );
        }
      }
      job.occupationalAreas = occupationalAreas || [];
    }

    // Update pictures array (max 3)
    if (pictures !== undefined) {
      if (Array.isArray(pictures) && pictures.length > 3) {
        return NextResponse.json(
          { error: 'Maximum 3 pictures allowed' },
          { status: 400 }
        );
      }
      job.pictures = pictures || [];
    }

    // Update spam flag (admin can clear spam flag)
    if (spam !== undefined) {
      if (spam === 'yes' || spam === 'no') {
        job.spam = spam;
      }
    }

    // Update published flag (admin can publish/unpublish any job)
    if (published !== undefined) {
      job.published = published === true;
    }

    // Update featured flag (admin can feature/unfeature any job)
    if (featured !== undefined) {
      job.featured = featured === true;
    }

    // Update application fields
    if (applyByEmail !== undefined) {
      job.applyByEmail = applyByEmail === true;
    }
    if (applyByWebsite !== undefined) {
      job.applyByWebsite = applyByWebsite === true;
    }
    if (applicationEmail !== undefined) {
      job.applicationEmail = applicationEmail || undefined;
    }
    if (applicationWebsite !== undefined) {
      job.applicationWebsite = applicationWebsite || undefined;
    }

    await job.save();

    const updatedJob = await Job.findById(job._id)
      .populate('recruiter', 'name email')
      .populate('companyId', 'name');

    return NextResponse.json(
      { message: 'Job updated successfully', job: updatedJob },
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
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a job (admin only, can delete any job)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const job = await Job.findById(id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Store job data for audit log before deletion
    const jobData = {
      id: String(job._id),
      title: job.title,
      company: job.company,
      companyId: job.companyId ? String(job.companyId) : undefined,
      recruiter: job.recruiter ? String(job.recruiter) : undefined,
    };

    await Job.findByIdAndDelete(id);

    // Create audit log
    await createDeleteAuditLog(request, {
      entityType: 'job',
      entityId: id,
      userId: user.userId,
      before: jobData,
      reason: `Deleted job "${job.title}" at ${job.company}`,
    });

    return NextResponse.json(
      { message: 'Job deleted successfully' },
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
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

