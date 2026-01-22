import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all companies (admin only)
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

    // Stage 1: Project only required fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        address: 1,
        website: 1,
        featured: 1,
        owner: 1,
        createdAt: 1,
      }
    });

    // Stage 2: Lookup owner info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerInfo',
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

    // Stage 3: Unwind owner info (should be single element)
    pipeline.push({
      $unwind: {
        path: '$ownerInfo',
        preserveNullAndEmptyArrays: true,
      }
    });

    // Stage 4: Apply search filter (if provided)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { website: { $regex: search, $options: 'i' } },
            { 'address.city': { $regex: search, $options: 'i' } },
            { 'address.state': { $regex: search, $options: 'i' } },
            { 'address.country': { $regex: search, $options: 'i' } },
            { 'ownerInfo.name': { $regex: search, $options: 'i' } },
            { 'ownerInfo.email': { $regex: search, $options: 'i' } },
          ]
        }
      });
    }

    // Stage 5: Sort based on sortBy parameter
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    let sortField: string;
    
    // Map UI sort keys to database fields
    switch (sortBy) {
      case 'name':
        sortField = 'name';
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

    // Stage 6: Limit results
    pipeline.push({
      $limit: 200
    });

    // Execute aggregation
    const companies = await dbConnection.collection('companies')
      .aggregate(pipeline)
      .maxTimeMS(10000)
      .toArray();

    const companiesWithData = companies.map((company: any) => ({
      id: company._id.toString(),
      name: company.name,
      address: company.address,
      website: company.website,
      featured: company.featured === true, // Explicitly check for true, default to false
      owner: company.ownerInfo || { name: 'Unknown', email: 'unknown@example.com' },
      createdAt: company.createdAt,
    }));

    return NextResponse.json({ companies: companiesWithData }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /admin/companies] Error:', error);
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

