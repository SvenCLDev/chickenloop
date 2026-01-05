import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CV from '@/models/CV';
import { requireRole } from '@/lib/auth';

// POST - Toggle favourite status for a candidate (recruiters only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['recruiter', 'admin']);
    await connectDB();
    const { id } = await params;

    // Verify CV exists
    const cv = await CV.findById(id);
    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    // Get user with favourites
    const userData = await User.findById(user.userId);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize favouriteCandidates if it doesn't exist
    if (!userData.favouriteCandidates) {
      userData.favouriteCandidates = [];
    }

    const cvId = cv._id as any;
    const isFavourite = userData.favouriteCandidates.some(
      (favId: any) => favId.toString() === cvId.toString()
    );

    if (isFavourite) {
      // Remove from favourites
      userData.favouriteCandidates = userData.favouriteCandidates.filter(
        (favId: any) => favId.toString() !== cvId.toString()
      );
    } else {
      // Add to favourites
      userData.favouriteCandidates.push(cvId);
    }

    await userData.save();

    return NextResponse.json(
      {
        message: isFavourite ? 'Removed from favourites' : 'Added to favourites',
        isFavourite: !isFavourite,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

// GET - Check if candidate is in favourites (recruiters only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['recruiter', 'admin']);
    await connectDB();
    const { id } = await params;

    const userData = await User.findById(user.userId);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize favouriteCandidates if it doesn't exist
    if (!userData.favouriteCandidates) {
      userData.favouriteCandidates = [];
    }

    const isFavourite = userData.favouriteCandidates.some(
      (favId: any) => favId.toString() === id
    );

    return NextResponse.json({ isFavourite }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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








