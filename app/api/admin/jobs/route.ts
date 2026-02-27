import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all jobs (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const sortBy = searchParams.get('sortBy')?.trim() || 'created';
    const sortOrder = searchParams.get('sortOrder')?.trim() || 'desc';
    
    // Add timeout for database connection
    const dbPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000)
    );
    await Promise.race([dbPromise, timeoutPromise]);

    const dbConnection = mongoose.connection.db;
    if (!dbConnection) {
      throw new Error('Database object not available');
    }

    // Use the same collection name as Mongoose for Company (job details page uses populate on companyId)
    const companiesCollection = Company.collection.name;

    // Build aggregation pipeline for efficient filtering and sorting
    const pipeline: any[] = [];

    // Stage 1: Project only required fields
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        city: 1,
        country: 1,
        featured: 1,
        recruiter: 1,
        companyId: 1,
        createdAt: 1,
        visitCount: 1,
      }
    });

    // Stage 2: Lookup company name (match by string id so ObjectId/string both work)
    pipeline.push({
      $lookup: {
        from: companiesCollection,
        let: { cid: '$companyId' },
        pipeline: [
          { $match: { $expr: { $eq: [{ $toString: '$_id' }, { $toString: '$$cid' }] } } },
          { $project: { name: 1 } },
        ],
        as: 'companyInfo',
      }
    });
    pipeline.push({
      $addFields: {
        companyName: { $arrayElemAt: ['$companyInfo.name', 0] },
      }
    });

    // Stage 3: Lookup recruiter info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'recruiter',
        foreignField: '_id',
        as: 'recruiterInfo',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
            }
          }
        ]
      }
    });

    // Stage 4: Unwind recruiter info (should be single element)
    pipeline.push({
      $unwind: {
        path: '$recruiterInfo',
        preserveNullAndEmptyArrays: true,
      }
    });

    // Stage 5: Apply search filter (if provided)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { city: { $regex: search, $options: 'i' } },
            { country: { $regex: search, $options: 'i' } },
            { 'recruiterInfo.name': { $regex: search, $options: 'i' } },
            { 'recruiterInfo.email': { $regex: search, $options: 'i' } },
          ]
        }
      });
    }

    // Stage 6: Add computed fields for sorting
    pipeline.push({
      $addFields: {
        recruiterName: { $ifNull: ['$recruiterInfo.name', ''] },
        location: { $ifNull: ['$city', ''] }, // Use city as primary location field
      }
    });

    // Stage 7: Sort based on sortBy parameter
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    let sortField: string;
    
    // Map UI sort keys to database fields
    switch (sortBy) {
      case 'title':
        sortField = 'title';
        break;
      case 'location':
        sortField = 'location'; // This is the computed field from city
        break;
      case 'recruiter':
        sortField = 'recruiterName'; // This is the computed field from recruiterInfo.name
        break;
      case 'featured':
        sortField = 'featured';
        break;
      case 'created':
        sortField = 'createdAt';
        break;
      default:
        sortField = 'createdAt';
    }
    
    pipeline.push({
      $sort: { [sortField]: sortDirection }
    });

    // Stage 8: Limit results
    pipeline.push({
      $limit: 1000
    });

    // Execute aggregation
    const jobs = await dbConnection.collection('jobs')
      .aggregate(pipeline)
      .maxTimeMS(10000)
      .toArray();

    const jobsWithData = jobs.map((job: any) => ({
      id: job._id.toString(),
      title: job.title,
      companyName: job.companyName || '—',
      city: job.city,
      country: job.country,
      featured: job.featured || false,
      recruiter: job.recruiterInfo || { name: 'Unknown', email: 'unknown@example.com' },
      createdAt: job.createdAt,
      visitCount: job.visitCount ?? 0,
    }));

    return NextResponse.json({ jobs: jobsWithData }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /admin/jobs] Error:', error);
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
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
