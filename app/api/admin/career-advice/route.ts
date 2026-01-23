import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CareerAdvice from '@/models/CareerAdvice';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all career advice articles (admin only, optimized for table view)
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

    // Build aggregation pipeline for efficient data fetching
    const pipeline: any[] = [];

    // Stage 1: Project only required fields
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        author: 1,
        createdAt: 1,
      }
    });

    // Stage 2: Lookup author info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'authorInfo',
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

    // Stage 3: Unwind author info (should be single element)
    pipeline.push({
      $unwind: {
        path: '$authorInfo',
        preserveNullAndEmptyArrays: true,
      }
    });

    // Stage 4: Add computed fields for sorting
    pipeline.push({
      $addFields: {
        authorName: { $ifNull: ['$authorInfo.name', ''] },
      }
    });

    // Stage 5: Apply search filter (if provided)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { 'authorInfo.name': { $regex: search, $options: 'i' } },
            { 'authorInfo.email': { $regex: search, $options: 'i' } },
          ]
        }
      });
    }

    // Stage 6: Sort based on sortBy parameter
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    let sortField: string;
    
    // Map UI sort keys to database/computed fields
    switch (sortBy) {
      case 'title':
        sortField = 'title';
        break;
      case 'author':
        sortField = 'authorName'; // Sort on computed author name
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

    // Execute aggregation - use the model's collection name
    const collectionName = CareerAdvice.collection.name;
    const articles = await dbConnection.collection(collectionName)
      .aggregate(pipeline)
      .maxTimeMS(10000)
      .toArray();

    // Map results to expected format
    const articlesWithData = articles.map((article: any) => ({
      id: article._id.toString(),
      title: article.title || 'Untitled',
      author: article.authorInfo
        ? { name: article.authorInfo.name || 'Unknown', email: article.authorInfo.email || 'unknown@example.com' }
        : { name: 'Unknown', email: 'unknown@example.com' },
      createdAt: article.createdAt,
    }));

    return NextResponse.json({ articles: articlesWithData }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /admin/career-advice] Error:', error);
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
