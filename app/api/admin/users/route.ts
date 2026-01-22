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
    const roleFilter = searchParams.get('role')?.trim(); // Optional role filter for sorting context
    
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
    
    // Global search filter (case-insensitive partial match on name, email, and company name for recruiters)
    // Can be combined with email filter
    // When both are present: email must match email filter AND (name OR email OR company name matches search)
    let recruiterIdsFromCompanySearch: any[] = [];
    if (search) {
      // First, find companies matching the search term (for recruiter company name search)
      const matchingCompanies = await dbConnection.collection('companies')
        .find({ name: { $regex: search, $options: 'i' } }, { projection: { owner: 1 } })
        .maxTimeMS(5000)
        .toArray();
      
      recruiterIdsFromCompanySearch = matchingCompanies.map((c: any) => c.owner);
      
      // Build search conditions for user fields
      const searchConditions: any[] = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
      
      // If we found companies matching the search, include their owner IDs in the search
      if (recruiterIdsFromCompanySearch.length > 0) {
        searchConditions.push({ _id: { $in: recruiterIdsFromCompanySearch } });
      }
      
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

    // Determine if we need database-level sorting
    // For recruiter-specific computed fields (companyName, jobCount), we'll sort after fetching
    // For database fields (name, email), we can sort at DB level
    // For lastActive, it's computed from lastOnline/updatedAt/createdAt, so we sort after fetching
    const computedSortFields = ['companyName', 'jobCount', 'lastActive'];
    const dbSortFields = ['name', 'email'];
    const isComputedSort = computedSortFields.includes(sortBy);
    const isDbSortable = dbSortFields.includes(sortBy);
    
    // Build sort object for database query (only for database-level fields)
    let dbSort: any = {};
    if (isDbSortable && sortBy) {
      // Direct database field sorting
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
      dbSort[sortBy] = sortDirection;
    } else {
      // Default sort: lastActive DESC (sort by lastOnline DESC, then updatedAt DESC, then createdAt DESC)
      // This provides a reasonable default ordering even before we compute lastActive
      dbSort = { lastOnline: -1, updatedAt: -1, createdAt: -1 };
    }

    // Use simple find query with sorting where possible
    const users = await dbConnection.collection('users')
      .find(queryFilter, { projection: { password: 0 } })
      .sort(dbSort)
      .limit(200) // Limit to prevent timeout
      .maxTimeMS(10000) // 10 second timeout
      .toArray();
    
    // Manually populate jobs and CVs for recruiters and job-seekers
    const recruiterIds = users.filter((u: any) => u.role === 'recruiter').map((u: any) => u._id);
    const jobSeekerIds = users.filter((u: any) => u.role === 'job-seeker').map((u: any) => u._id);
    
    const [jobsByRecruiter, cvsByJobSeeker, companiesByOwner] = await Promise.all([
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
        : [],
      recruiterIds.length > 0
        ? dbConnection.collection('companies')
            .find({ owner: { $in: recruiterIds } }, { projection: { name: 1, owner: 1 } })
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
    
    // Map companies by owner (recruiter ID)
    const companyMap = new Map<string, string>();
    companiesByOwner.forEach((company: any) => {
      const ownerId = company.owner.toString();
      companyMap.set(ownerId, company.name);
    });
    
    // Count jobs per recruiter
    const jobCountMap = new Map<string, number>();
    jobsMap.forEach((jobs, recruiterId) => {
      jobCountMap.set(recruiterId, jobs.length);
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
    let formattedUsers = usersWithData.map((user: any) => {
      const baseUser = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastOnline: user.lastOnline,
        jobs: user.jobs || [],
        cv: user.cv || null,
      };
      
      // Add recruiter-specific fields
      if (user.role === 'recruiter') {
        const recruiterId = user._id.toString();
        return {
          ...baseUser,
          companyName: companyMap.get(recruiterId) || null,
          lastActive: user.lastOnline || user.updatedAt || user.createdAt,
          jobCount: jobCountMap.get(recruiterId) || 0,
        };
      }
      
      return baseUser;
    });

    // Sorting logic
    // Allowed sort fields for job-seekers
    const allowedJobSeekerSortFields = ['name', 'email', 'lastActive', 'hasCV', 'availability'];
    // Allowed sort fields for recruiters
    const allowedRecruiterSortFields = ['name', 'email', 'companyName', 'lastActive', 'jobCount'];
    
    // Determine which allowlist to use based on role filter or default to recruiter fields
    // If no role filter, we'll validate against both and use the appropriate one per user
    const allAllowedSortFields = [...new Set([...allowedJobSeekerSortFields, ...allowedRecruiterSortFields])];
    
    // Validate sortBy against allowlist
    let validSortBy = 'lastActive'; // Default
    if (sortBy && allAllowedSortFields.includes(sortBy)) {
      validSortBy = sortBy;
    }
    
    // Determine sort order
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    
    // Apply sorting (client-side for computed fields, or refine DB sort for complex cases)
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
          // Use lastActive field if available (for recruiters), otherwise compute from lastOnline/updatedAt/createdAt
          if (a.lastActive && b.lastActive) {
            aValue = new Date(a.lastActive).getTime();
            bValue = new Date(b.lastActive).getTime();
          } else {
            aValue = a.lastOnline ? new Date(a.lastOnline).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime());
            bValue = b.lastOnline ? new Date(b.lastOnline).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime());
          }
          break;
        case 'companyName':
          // Recruiter-specific: sort by company name (null/undefined comes last)
          aValue = (a.companyName || '').toLowerCase();
          bValue = (b.companyName || '').toLowerCase();
          // Handle null/undefined values (put them at the end)
          if (!a.companyName && b.companyName) return 1;
          if (a.companyName && !b.companyName) return -1;
          break;
        case 'jobCount':
          // Recruiter-specific: sort by job count
          aValue = a.jobCount ?? 0;
          bValue = b.jobCount ?? 0;
          break;
        case 'hasCV':
          // Job-seeker-specific: Boolean: true (has CV) comes before false (no CV)
          aValue = a.cv ? 1 : 0;
          bValue = b.cv ? 1 : 0;
          break;
        case 'availability':
          // Job-seeker-specific: Sort by availability string, empty/null comes last
          aValue = a.cv?.availability || '';
          bValue = b.cv?.availability || '';
          break;
        default:
          // Default: lastActive DESC
          if (a.lastActive && b.lastActive) {
            aValue = new Date(a.lastActive).getTime();
            bValue = new Date(b.lastActive).getTime();
          } else {
            aValue = a.lastOnline ? new Date(a.lastOnline).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime());
            bValue = b.lastOnline ? new Date(b.lastOnline).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime());
          }
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

