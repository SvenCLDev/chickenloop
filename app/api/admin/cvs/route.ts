import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get all CVs (admin only)
export async function GET(request: NextRequest) {
  try {
    requireRole(request, ['admin']);
    
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

    // Fetch CVs with job seeker info
    const cvs = await dbConnection.collection('cvs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000) // Reasonable limit
      .maxTimeMS(10000)
      .toArray();

    // Get job seeker IDs
    const jobSeekerIds = [...new Set(cvs.map((cv: any) => cv.jobSeeker).filter(Boolean))];
    const jobSeekers = jobSeekerIds.length > 0
      ? await dbConnection.collection('users')
          .find({ _id: { $in: jobSeekerIds } }, { projection: { name: 1, email: 1 } })
          .maxTimeMS(5000)
          .toArray()
      : [];
    const jobSeekerMap = new Map(jobSeekers.map((js: any) => [js._id.toString(), { name: js.name, email: js.email }]));

    const cvsWithData = cvs.map((cv: any) => ({
      id: cv._id.toString(),
      jobSeeker: cv.jobSeeker ? (jobSeekerMap.get(cv.jobSeeker.toString()) || { name: 'Unknown', email: 'unknown@example.com' }) : null,
      published: cv.published || false,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
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






