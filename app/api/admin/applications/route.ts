import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all applications (admin only)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[API /admin/applications] Starting request');
  try {
    requireRole(request, ['admin']);
    
    // Add timeout for database connection
    const dbPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000)
    );
    await Promise.race([dbPromise, timeoutPromise]);
    console.log(`[API /admin/applications] Database connected in ${Date.now() - startTime}ms`);

    const dbConnection = mongoose.connection.db;
    if (!dbConnection) {
      throw new Error('Database object not available');
    }

    // Parse query parameters for filtering, sorting, and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const company = searchParams.get('company');
    const jobSeeker = searchParams.get('jobSeeker');
    const sortBy = searchParams.get('sortBy') || 'applied';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const pageParam = searchParams.get('page');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    console.log('[API /admin/applications] Fetching applications with filters:', { status, company, jobSeeker, sortBy, sortOrder, page, limit, skip });
    const queryStart = Date.now();

    // Build filter query for applications
    // NOTE: Admins see ALL applications regardless of published status
    // Unlike recruiters, admins are not filtered by published field
    const applicationFilter: any = {};
    if (status) {
      applicationFilter.status = status;
    }

    // Fetch ALL applications matching status filter (we'll filter and paginate after population)
    // This is necessary because company/jobSeeker filters require populated data
    // For production, consider using MongoDB aggregation with $lookup for better performance
    let applications = await dbConnection.collection('applications')
      .find(applicationFilter)
      .sort({ createdAt: -1 })
      .limit(5000) // Reasonable limit to prevent memory issues
      .maxTimeMS(10000) // 10 second timeout
      .toArray();
    
    // Get unique IDs for population
    const jobIds = [...new Set(applications.map((a: any) => a.jobId).filter(Boolean))];
    const candidateIds = [...new Set(applications.map((a: any) => a.candidateId).filter(Boolean))];
    const recruiterIds = [...new Set(applications.map((a: any) => a.recruiterId).filter(Boolean))];

    // Populate related data
    const [jobs, candidates, recruiters] = await Promise.all([
      jobIds.length > 0
        ? dbConnection.collection('jobs')
            .find({ _id: { $in: jobIds } }, { projection: { title: 1, company: 1 } })
            .maxTimeMS(5000)
            .toArray()
        : [],
      candidateIds.length > 0
        ? dbConnection.collection('users')
            .find({ _id: { $in: candidateIds } }, { projection: { name: 1, email: 1 } })
            .maxTimeMS(5000)
            .toArray()
        : [],
      recruiterIds.length > 0
        ? dbConnection.collection('users')
            .find({ _id: { $in: recruiterIds } }, { projection: { name: 1, email: 1 } })
            .maxTimeMS(5000)
            .toArray()
        : [],
    ]);

    // Create maps for quick lookup
    const jobMap = new Map(jobs.map((j: any) => [j._id.toString(), { title: j.title, company: j.company }]));
    const candidateMap = new Map(candidates.map((c: any) => [c._id.toString(), { name: c.name, email: c.email }]));
    const recruiterMap = new Map(recruiters.map((r: any) => [r._id.toString(), { name: r.name, email: r.email }]));

    const queryTime = Date.now() - queryStart;
    console.log(`[API /admin/applications] Fetched ${applications.length} applications in ${queryTime}ms`);

    let applicationsWithData = applications.map((app: any) => {
      const job = app.jobId ? jobMap.get(app.jobId.toString()) : null;
      const candidate = candidateMap.get(app.candidateId?.toString()) || { name: 'Unknown', email: 'unknown@example.com' };
      const recruiter = recruiterMap.get(app.recruiterId?.toString()) || { name: 'Unknown', email: 'unknown@example.com' };

      return {
        id: app._id.toString(),
        jobId: app.jobId ? app.jobId.toString() : null,
        jobTitle: job?.title || 'No job linked',
        company: job?.company || 'N/A',
        candidateId: app.candidateId?.toString(),
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        recruiterId: app.recruiterId?.toString(),
        recruiterName: recruiter.name,
        recruiterEmail: recruiter.email,
        status: app.status || 'applied',
        published: app.published !== undefined ? app.published : true, // Default to true for legacy records
        appliedAt: app.appliedAt,
        lastActivityAt: app.lastActivityAt || app.appliedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      };
    });

    // Apply client-side filters (company, jobSeeker) after population
    // This is necessary because these fields come from populated data
    let filteredApplications = applicationsWithData;
    if (company) {
      filteredApplications = filteredApplications.filter((app: any) =>
        app.company.toLowerCase().includes(company.toLowerCase())
      );
    }
    if (jobSeeker) {
      const searchLower = jobSeeker.toLowerCase();
      filteredApplications = filteredApplications.filter((app: any) =>
        app.candidateName.toLowerCase().includes(searchLower) ||
        app.candidateEmail.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting to filtered applications
    // Map sortBy values to actual data fields
    const sortFieldMap: Record<string, string> = {
      'jobTitle': 'jobTitle',
      'company': 'company',
      'jobSeeker': 'candidateName',
      'status': 'status',
      'applied': 'appliedAt',
      'updated': 'lastActivityAt',
    };
    
    const sortField = sortFieldMap[sortBy] || 'appliedAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    
    filteredApplications.sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Handle date fields
      if (sortField === 'appliedAt' || sortField === 'lastActivityAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Handle string fields (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return -1 * sortDirection;
      if (aValue > bValue) return 1 * sortDirection;
      return 0;
    });

    // Get total count of filtered applications
    const totalCount = filteredApplications.length;
    
    // Apply pagination to filtered and sorted results
    const paginatedApplications = filteredApplications.slice(skip, skip + limit);
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    const totalTime = Date.now() - startTime;
    console.log(`[API /admin/applications] Total time: ${totalTime}ms, returning ${paginatedApplications.length} applications (page ${page} of ${totalPages}, total: ${totalCount})`);

    return NextResponse.json({
      applications: paginatedApplications,
      totalCount: totalCount,
      currentPage: page,
      totalPages: totalPages,
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /admin/applications] Error:', error);
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
