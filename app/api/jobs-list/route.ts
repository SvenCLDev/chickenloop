import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import mongoose from 'mongoose';
import { CachePresets } from '@/lib/cache';

// GET - Get all jobs (accessible to all users, including anonymous)
// This endpoint is kept for backward compatibility - it uses the same logic as /api/jobs
export async function GET(request: NextRequest) {
  try {
    console.log('[API /jobs-list] Starting request (forwarding to /api/jobs logic)');

    // Add timeout for database connection
    const startTime = Date.now();
    const dbPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout after 15 seconds')), 15000)
    );

    await Promise.race([dbPromise, timeoutPromise]);
    const connectTime = Date.now() - startTime;
    console.log(`[API /jobs-list] Database connected in ${connectTime}ms`);

    const readyState = mongoose.connection.readyState;
    if (readyState !== 1) {
      throw new Error(`Database connection not ready. State: ${readyState}`);
    }

    const dbConnection = mongoose.connection.db;
    if (!dbConnection) {
      throw new Error('Database object not available after connection');
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');

    const collection = dbConnection.collection('jobs');
    const queryFilter: any = {};

    // If featured=true, filter for featured jobs
    if (featured === 'true') {
      queryFilter.featured = true;
    }

    // Use index hint for better performance
    // Project only the fields needed for list display (include pictures for thumbnails)
    const projection = {
      _id: 1,
      title: 1,
      company: 1,
      location: 1,
      country: 1,
      salary: 1,
      type: 1,
      recruiter: 1,
      companyId: 1,
      sports: 1,
      occupationalAreas: 1,
      published: 1,
      featured: 1,
      pictures: 1, // Need for list thumbnails
      createdAt: 1,
      updatedAt: 1,
      // Exclude: description, languages, qualifications (loaded on detail page)
    };

    const queryCursor = collection.find(queryFilter)
      .project(projection)
      .hint({ published: 1, createdAt: -1 }) // Use the compound index
      .maxTimeMS(10000);
    let jobsWithoutPopulate: any[] = await queryCursor.toArray();

    // Filter for published jobs
    jobsWithoutPopulate = jobsWithoutPopulate.filter((job: any) => job.published !== false);

    // Convert ObjectIds to strings
    jobsWithoutPopulate = jobsWithoutPopulate.map((job: any) => ({
      ...job,
      _id: job._id.toString(),
      recruiter: job.recruiter ? job.recruiter.toString() : null,
      companyId: job.companyId ? job.companyId.toString() : null,
    }));

    // Sort by updatedAt descending (most recently updated first)
    jobsWithoutPopulate.sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Populate recruiter info
    let jobs = jobsWithoutPopulate;
    if (jobsWithoutPopulate.length > 0 && jobsWithoutPopulate[0].recruiter) {
      try {
        const db = mongoose.connection.db;
        if (db) {
          const usersCollection = db.collection('users');
          const recruiterIds = [...new Set(jobsWithoutPopulate.map((j: any) => j.recruiter).filter(Boolean))];

          const recruiters = await usersCollection.find({
            _id: { $in: recruiterIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
          })
            .project({ name: 1, email: 1 })
            .maxTimeMS(3000)
            .toArray();

          const recruiterMap = new Map(
            recruiters.map((r: any) => [r._id.toString(), { name: r.name, email: r.email }])
          );

          jobs = jobsWithoutPopulate.map((job: any) => ({
            ...job,
            recruiter: job.recruiter ? (recruiterMap.get(job.recruiter) || { _id: job.recruiter }) : null
          }));
        }
      } catch (populateError: any) {
        console.error('[API /jobs-list] Populate error:', populateError.message);
        jobs = jobsWithoutPopulate;
      }
    }

    // Add cache headers - jobs can be cached for 2 minutes with stale-while-revalidate
    const cacheHeaders = CachePresets.short();

    return NextResponse.json({ jobs }, {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/jobs-list:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

