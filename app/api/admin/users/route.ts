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
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const email = searchParams.get('email')?.trim() || '';
    const sortBy = searchParams.get('sortBy')?.trim() || '';
    const sortOrder = searchParams.get('sortOrder')?.trim() || 'desc';
    
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

    // Build MongoDB query filter
    const queryFilter: any = {};
    
    // Email-specific filter (case-insensitive partial match)
    // This restricts results to emails matching the email pattern
    if (email) {
      queryFilter.email = { $regex: email, $options: 'i' };
    }
    
    // Global search filter (case-insensitive partial match on name and email)
    // Can be combined with email filter
    // When both are present: email must match email filter AND (name OR email matches search)
    if (search) {
      const searchConditions = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
      
      if (email) {
        // Both filters: email already restricted by email filter, add search OR condition
        queryFilter.$and = [
          { $or: searchConditions }
        ];
      } else {
        // Only search filter
        queryFilter.$or = searchConditions;
      }
    }

    // Use simple find query instead of complex aggregation - much faster
    const users = await dbConnection.collection('users')
      .find(queryFilter, { projection: { password: 0 } })
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

    // Transform to match expected format
    let formattedUsers = usersWithData.map((user: any) => ({
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

    // Sorting logic
    // Allowed sort fields for job-seekers
    const allowedSortFields = ['name', 'email', 'lastActive', 'hasCV', 'availability'];
    
    // Validate sortBy against allowlist
    let validSortBy = 'lastActive'; // Default
    if (sortBy && allowedSortFields.includes(sortBy)) {
      validSortBy = sortBy;
    }
    
    // Determine sort order
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    
    // Apply sorting
    formattedUsers.sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;
      
      switch (validSortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'lastActive':
          // Use lastOnline if available, otherwise updatedAt, fallback to createdAt
          aValue = a.lastOnline ? new Date(a.lastOnline).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime());
          bValue = b.lastOnline ? new Date(b.lastOnline).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime());
          break;
        case 'hasCV':
          // Boolean: true (has CV) comes before false (no CV)
          aValue = a.cv ? 1 : 0;
          bValue = b.cv ? 1 : 0;
          break;
        case 'availability':
          // Sort by availability string, empty/null comes last
          aValue = a.cv?.availability || '';
          bValue = b.cv?.availability || '';
          break;
        default:
          // Default: lastActive DESC
          aValue = a.lastOnline ? new Date(a.lastOnline).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime());
          bValue = b.lastOnline ? new Date(b.lastOnline).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime());
      }
      
      // Handle comparison
      if (aValue < bValue) return -1 * sortDirection;
      if (aValue > bValue) return 1 * sortDirection;
      return 0;
    });

    const queryTime = Date.now() - queryStart;
    console.log(`[API /admin/users] Fetched ${formattedUsers.length} users in ${queryTime}ms`);

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

