import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all users with their data (admin only)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[API /admin/users] Starting request');
  try {
    requireRole(request, ['admin']);
    
    // Add timeout for database connection
    const dbPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000)
    );
    await Promise.race([dbPromise, timeoutPromise]);
    console.log(`[API /admin/users] Database connected in ${Date.now() - startTime}ms`);

    // Use aggregation with $lookup to avoid N+1 queries
    const dbConnection = mongoose.connection.db;
    if (!dbConnection) {
      throw new Error('Database object not available');
    }

    console.log('[API /admin/users] Fetching users with simple query...');
    const queryStart = Date.now();

    // Use simple find query instead of complex aggregation - much faster
    const users = await dbConnection.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .limit(200) // Limit to prevent timeout
      .maxTimeMS(10000) // 10 second timeout
      .toArray();
    
    // Manually populate jobs and CVs for recruiters and job-seekers
    const recruiterIds = users.filter((u: any) => u.role === 'recruiter').map((u: any) => u._id);
    const jobSeekerIds = users.filter((u: any) => u.role === 'job-seeker').map((u: any) => u._id);
    
    const [jobsByRecruiter, cvsByJobSeeker] = await Promise.all([
      recruiterIds.length > 0
        ? dbConnection.collection('jobs')
            .find({ recruiter: { $in: recruiterIds } })
            .maxTimeMS(5000)
            .toArray()
        : [],
      jobSeekerIds.length > 0
        ? dbConnection.collection('cvs')
            .find({ jobSeeker: { $in: jobSeekerIds } })
            .maxTimeMS(5000)
            .toArray()
        : []
    ]);
    
    // Group jobs by recruiter and CVs by job seeker
    const jobsMap = new Map<string, any[]>();
    jobsByRecruiter.forEach((job: any) => {
      const recruiterId = job.recruiter.toString();
      if (!jobsMap.has(recruiterId)) {
        jobsMap.set(recruiterId, []);
      }
      jobsMap.get(recruiterId)!.push(job);
    });
    
    const cvMap = new Map<string, any>();
    cvsByJobSeeker.forEach((cv: any) => {
      cvMap.set(cv.jobSeeker.toString(), cv);
    });
    
    const usersWithData = users.map((user: any) => ({
      ...user,
      jobs: user.role === 'recruiter' ? (jobsMap.get(user._id.toString()) || []) : undefined,
      cv: user.role === 'job-seeker' ? (cvMap.get(user._id.toString()) || null) : undefined,
    }));

    const queryTime = Date.now() - queryStart;
    console.log(`[API /admin/users] Fetched ${usersWithData.length} users in ${queryTime}ms`);

    // Transform to match expected format
    const formattedUsers = usersWithData.map((user: any) => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastOnline: user.lastOnline,
      jobs: user.jobs || [],
      cv: user.cv || null,
    }));

    const totalTime = Date.now() - startTime;
    console.log(`[API /admin/users] Total time: ${totalTime}ms`);

    return NextResponse.json({ users: formattedUsers }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /admin/users] Error:', error);
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

