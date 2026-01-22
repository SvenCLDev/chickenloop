import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all CVs (admin only)
export async function GET(request: NextRequest) {
  try {
    requireRole(request, ['admin']);
    
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

    // Build aggregation pipeline for efficient filtering and sorting
    const pipeline: any[] = [];

    // Stage 1: Match CVs (with projection for minimal fields)
    pipeline.push({
      $project: {
        _id: 1,
        jobSeeker: 1,
        published: 1,
        createdAt: 1,
      }
    });

    // Stage 2: Lookup job seeker info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'jobSeeker',
        foreignField: '_id',
        as: 'jobSeekerInfo',
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

    // Stage 3: Unwind job seeker info (should be single element)
    pipeline.push({
      $unwind: {
        path: '$jobSeekerInfo',
        preserveNullAndEmptyArrays: true,
      }
    });

    // Stage 4: Apply search filter (if provided)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'jobSeekerInfo.name': { $regex: search, $options: 'i' } },
            { 'jobSeekerInfo.email': { $regex: search, $options: 'i' } },
          ]
        }
      });
    }

    // Stage 5: Add computed fields for sorting
    pipeline.push({
      $addFields: {
        jobSeekerName: { $ifNull: ['$jobSeekerInfo.name', ''] },
        jobSeekerEmail: { $ifNull: ['$jobSeekerInfo.email', ''] },
      }
    });

    // Stage 6: Sort based on sortBy parameter
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    let sortField: string;
    
    // Map UI sort keys to database fields
    switch (sortBy) {
      case 'jobSeeker':
        sortField = 'jobSeekerName';
        break;
      case 'email':
        sortField = 'jobSeekerEmail';
        break;
      case 'published':
        sortField = 'published';
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

    // Stage 7: Limit results
    pipeline.push({
      $limit: 1000
    });

    // Execute aggregation
    const cvs = await dbConnection.collection('cvs')
      .aggregate(pipeline)
      .maxTimeMS(10000)
      .toArray();

    // Map results to expected format
    const cvsWithData = cvs.map((cv: any) => ({
      id: cv._id.toString(),
      jobSeeker: cv.jobSeekerInfo
        ? { name: cv.jobSeekerInfo.name || 'Unknown', email: cv.jobSeekerInfo.email || 'unknown@example.com' }
        : null,
      published: cv.published || false,
      createdAt: cv.createdAt,
    }));

    return NextResponse.json({ cvs: cvsWithData }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /admin/cvs] Error:', error);
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









