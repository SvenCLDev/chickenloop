import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireAuth, requireRole } from '@/lib/auth';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import { normalizeUrl } from '@/lib/normalizeUrl';

// GET - Get a single job (accessible to all users, including anonymous)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const job = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate('companyId');
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if job is published (unpublished jobs are hidden from public)
    // Show jobs where published is true OR undefined (default is true)
    // Hide only jobs where published is explicitly false
    const jobPublished = job.published;
    if (jobPublished === false) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Increment visit count atomically using MongoDB's $inc operator
    // This prevents race conditions and double counting
    await Job.findByIdAndUpdate(id, { $inc: { visitCount: 1 } });
    
    // Reload the job to get the updated visit count
    const updatedJob = await Job.findById(id)
      .populate('recruiter', 'name email')
      .populate('companyId');
    
    if (!updatedJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Convert to plain object and ensure all fields are included, including country
    const jobObject = updatedJob.toObject();
    // Handle country field - normalize if it exists, ensure field is always present
    const countryValue = jobObject.country != null && typeof jobObject.country === 'string'
      ? (jobObject.country.trim() ? jobObject.country.trim().toUpperCase() : null)
      : jobObject.country; // Preserve null if explicitly set, or undefined if never set
    
    const jobResponse = {
      ...jobObject,
      city: jobObject.city, // Renamed from location
      country: countryValue,
    };

    return NextResponse.json({ job: jobResponse }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a job (recruiters can only update their own jobs)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();
    const { id } = await params;

    const job = await Job.findById(id);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.recruiter.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'You can only edit your own jobs' },
        { status: 403 }
      );
    }

    const requestBody = await request.json();
    
    // Safeguard: Reject requests that include deprecated `location` field
    if (requestBody.location !== undefined) {
      return NextResponse.json(
        { error: 'The `location` field has been deprecated. Please use `city` instead.' },
        { status: 400 }
      );
    }
    
    // Safeguard: Reject requests that include system-managed date fields
    if (requestBody.datePosted !== undefined || requestBody.validThrough !== undefined) {
      return NextResponse.json(
        { error: 'The `datePosted` and `validThrough` fields are system-managed and cannot be set manually.' },
        { status: 400 }
      );
    }

    const { title, description, company, city, country, salary, type, languages, qualifications, sports, occupationalAreas, pictures, published, featured, applyByEmail, applyByWebsite, applyByWhatsApp, applicationEmail, applicationWebsite, applicationWhatsApp } = requestBody;

    // Validate job categories - ensure all categories are in JOB_CATEGORIES
    if (occupationalAreas !== undefined && Array.isArray(occupationalAreas)) {
      const invalidCategories = occupationalAreas.filter(
        (category: string) => !JOB_CATEGORIES.includes(category as any)
      );
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { error: 'Invalid job category' },
          { status: 400 }
        );
      }
    }

    // Validate required fields if provided
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        { error: 'Job Title is required' },
        { status: 400 }
      );
    }
    if (description !== undefined && (!description || !description.trim())) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }
    if (city !== undefined && (!city || !city.trim())) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      );
    }
    if (country !== undefined && (!country || !country.trim())) {
      return NextResponse.json(
        { error: 'Country (ISO code) is required' },
        { status: 400 }
      );
    }
    if (type !== undefined && (!type || !type.trim())) {
      return NextResponse.json(
        { error: 'Employment Type is required' },
        { status: 400 }
      );
    }
    if (occupationalAreas !== undefined && (!Array.isArray(occupationalAreas) || occupationalAreas.length === 0)) {
      return NextResponse.json(
        { error: 'At least one Job Category is required' },
        { status: 400 }
      );
    }

    if (title) job.title = title;
    if (description) job.description = description;
    if (company) job.company = company;
    if (city) job.city = city;
    if (country !== undefined) {
      // Normalize country: trim and uppercase, or set to null if empty (null explicitly stores the field)
      job.country = country?.trim() ? country.trim().toUpperCase() : null;
    }
    if (salary !== undefined) job.salary = salary;
    if (type) job.type = type;
    if (languages !== undefined) {
      job.languages = languages || [];
      job.markModified('languages');
    }
    if (qualifications !== undefined) {
      job.qualifications = qualifications || [];
    }
    if (sports !== undefined) {
      job.sports = sports || [];
    }
    if (occupationalAreas !== undefined) {
      job.occupationalAreas = occupationalAreas || [];
    }
    if (pictures !== undefined) {
      if (Array.isArray(pictures) && pictures.length > 3) {
        return NextResponse.json(
          { error: 'Maximum 3 pictures allowed' },
          { status: 400 }
        );
      }
      job.pictures = pictures || [];
    }
    
    // Update published flag (recruiters can publish/unpublish their own jobs)
    // System-managed date fields: datePosted and validThrough
    const wasPublished = job.published === true;
    if (published !== undefined) {
      job.published = published === true;
      
      // Handle system-managed date fields when publishing status changes
      const isBeingPublished = published === true;
      
      if (isBeingPublished && !wasPublished) {
        // Job is being published for the first time
        if (!job.datePosted) {
          // Set datePosted to now (first time publishing)
          job.datePosted = new Date();
          // Set validThrough to datePosted + 90 days
          const validThroughDate = new Date(job.datePosted);
          validThroughDate.setDate(validThroughDate.getDate() + 90);
          job.validThrough = validThroughDate;
        } else {
          // Job was previously published, being republished
          // Keep existing datePosted, but ensure validThrough exists
          if (!job.validThrough) {
            const validThroughDate = new Date(job.datePosted);
            validThroughDate.setDate(validThroughDate.getDate() + 90);
            job.validThrough = validThroughDate;
          }
        }
      } else if (isBeingPublished && wasPublished) {
        // Job remains published - ensure datePosted and validThrough exist (backward compatibility)
        if (!job.datePosted) {
          // Use createdAt as fallback for existing published jobs
          job.datePosted = job.createdAt || new Date();
        }
        if (!job.validThrough) {
          const validThroughDate = new Date(job.datePosted);
          validThroughDate.setDate(validThroughDate.getDate() + 90);
          job.validThrough = validThroughDate;
        }
      }
      // If being unpublished, we don't change datePosted or validThrough
    } else if (wasPublished) {
      // Job is already published, ensure datePosted and validThrough exist (backward compatibility)
      if (!job.datePosted) {
        job.datePosted = job.createdAt || new Date();
      }
      if (!job.validThrough) {
        const validThroughDate = new Date(job.datePosted);
        validThroughDate.setDate(validThroughDate.getDate() + 90);
        job.validThrough = validThroughDate;
      }
    }
    
    // Featured flag can only be updated by admins, ignore if sent by recruiters
    // (featured field is intentionally not updated here)
    
    // Update application fields
    if (applyByEmail !== undefined) {
      job.applyByEmail = applyByEmail === true;
    }
    if (applyByWebsite !== undefined) {
      job.applyByWebsite = applyByWebsite === true;
    }
    if (applyByWhatsApp !== undefined) {
      job.applyByWhatsApp = applyByWhatsApp === true;
    }
    if (applicationEmail !== undefined) {
      job.applicationEmail = applicationEmail || undefined;
    }
    if (applicationWebsite !== undefined) {
      job.applicationWebsite = normalizeUrl(applicationWebsite);
    }
    if (applicationWhatsApp !== undefined) {
      job.applicationWhatsApp = applicationWhatsApp || undefined;
    }

    // Validate all required fields are present before saving
    const requiredFields: { [key: string]: string } = {};
    if (!job.title || !job.title.trim()) requiredFields.title = 'Job Title';
    if (!job.description || !job.description.trim()) requiredFields.description = 'Description';
    if (!job.city || !job.city.trim()) requiredFields.city = 'City';
    if (!job.country || !job.country.trim()) requiredFields.country = 'Country (ISO code)';
    if (!job.type || !job.type.trim()) requiredFields.type = 'Employment Type';
    if (!job.occupationalAreas || !Array.isArray(job.occupationalAreas) || job.occupationalAreas.length === 0) {
      requiredFields.category = 'Job Category';
    }
    
    if (Object.keys(requiredFields).length > 0) {
      const missingFields = Object.values(requiredFields).join(', ');
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields}` },
        { status: 400 }
      );
    }

    await job.save();

    const updatedJob = await Job.findById(job._id)
      .populate('recruiter', 'name email')
      .populate('companyId');
    
    // Convert to plain object and ensure all fields are included, including country
    const jobObject = updatedJob?.toObject();
    const jobResponse = jobObject ? {
      ...jobObject,
      city: jobObject.city, // Renamed from location
      // Handle country field - normalize if it exists, preserve null/undefined appropriately
      country: jobObject.country != null 
        ? (jobObject.country.trim() ? jobObject.country.trim().toUpperCase() : null)
        : undefined,
    } : updatedJob;

    return NextResponse.json(
      { message: 'Job updated successfully', job: jobResponse },
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

// DELETE - Delete a job (recruiters can only delete their own jobs)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();
    const { id } = await params;

    const job = await Job.findById(id);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.recruiter.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own jobs' },
        { status: 403 }
      );
    }

    await Job.findByIdAndDelete(id);

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

