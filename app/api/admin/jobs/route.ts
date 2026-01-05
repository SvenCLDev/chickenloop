import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all jobs (admin only)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[API /admin/jobs] Starting request');
  try {
    requireRole(request, ['admin']);
    
    // Add timeout for database connection
    const dbPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000)
    );
    await Promise.race([dbPromise, timeoutPromise]);
    console.log(`[API /admin/jobs] Database connected in ${Date.now() - startTime}ms`);

    const dbConnection = mongoose.connection.db;
    if (!dbConnection) {
      throw new Error('Database object not available');
    }

    console.log('[API /admin/jobs] Fetching jobs with simple query...');
    const queryStart = Date.now();

    // Use simple find query instead of complex aggregation - much faster
    const jobs = await dbConnection.collection('jobs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000) // Reasonable limit
      .maxTimeMS(10000) // 10 second timeout
      .toArray();
    
    // Manually populate recruiter info
    const recruiterIds = [...new Set(jobs.map((j: any) => j.recruiter).filter(Boolean))];
    const recruiters = recruiterIds.length > 0
      ? await dbConnection.collection('users')
          .find({ _id: { $in: recruiterIds } }, { projection: { name: 1, email: 1 } })
          .maxTimeMS(5000)
          .toArray()
      : [];
    const recruiterMap = new Map(recruiters.map((r: any) => [r._id.toString(), { name: r.name, email: r.email }]));

    const queryTime = Date.now() - queryStart;
    console.log(`[API /admin/jobs] Fetched ${jobs.length} jobs in ${queryTime}ms`);

    const jobsWithData = jobs.map((job: any) => ({
      id: job._id.toString(),
      title: job.title,
      description: job.description,
      company: job.company,
      city: job.city,
      country: job.country,
      salary: job.salary,
      type: job.type,
      languages: job.languages,
      qualifications: job.qualifications,
      sports: job.sports,
      occupationalAreas: job.occupationalAreas,
      pictures: job.pictures,
      published: job.published !== false, // Default to true if not explicitly false
      featured: job.featured || false,
      recruiter: job.recruiter ? (recruiterMap.get(job.recruiter.toString()) || { name: 'Unknown', email: 'unknown@example.com' }) : null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    const totalTime = Date.now() - startTime;
    console.log(`[API /admin/jobs] Total time: ${totalTime}ms`);

    return NextResponse.json({ jobs: jobsWithData }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /admin/jobs] Error:', error);
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
