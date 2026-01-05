import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';

// GET - Get all favourite jobs for the current user (job seekers only)
export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, ['job-seeker']);
    await connectDB();

    const userData = await User.findById(user.userId).populate('favouriteJobs');
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize favouriteJobs if it doesn't exist
    if (!userData.favouriteJobs) {
      userData.favouriteJobs = [];
    }

    // Get all favourite jobs with populated recruiter and companyId
    const favouriteJobIds = userData.favouriteJobs.map((id: any) => 
      typeof id === 'object' ? id._id : id
    );

    const jobs = await Job.find({
      _id: { $in: favouriteJobIds },
      published: { $ne: false }, // Only get published jobs
    })
      .populate('recruiter', 'name email')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Map jobs to include id field
    const jobsWithData = jobs.map((job: any) => ({
      _id: job._id,
      id: job._id,
      title: job.title,
      description: job.description,
      company: job.company,
      city: job.city,
      country: job.country,
      salary: job.salary,
      type: job.type,
      languages: job.languages || [],
      qualifications: job.qualifications || [],
      sports: job.sports || [],
      occupationalAreas: job.occupationalAreas || [],
      pictures: job.pictures || [],
      recruiter: job.recruiter,
      companyId: job.companyId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    return NextResponse.json({ jobs: jobsWithData }, { status: 200 });
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







