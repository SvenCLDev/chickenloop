import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SavedSearch from '@/models/SavedSearch';
import { requireAuth } from '@/lib/auth';

// GET - Get all saved searches for the current user
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();

    const savedSearches = await SavedSearch.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .lean();

    // Map sport to activity in responses (for API consistency)
    const mappedSearches = savedSearches.map((search: any) => {
      if (search.sport) {
        search.activity = search.sport;
      }
      return search;
    });

    return NextResponse.json({ savedSearches: mappedSearches }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.error('[API /saved-searches GET] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new saved search
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();

    const { name, keyword, location, country, category, activity, sport, language, frequency } = await request.json();

    // Validate frequency
    if (frequency && !['daily', 'weekly', 'never'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Frequency must be "daily", "weekly", or "never"' },
        { status: 400 }
      );
    }

    // Map activity to sport (for backward compatibility, also accept sport)
    const sportValue = activity || sport;

    // At least one filter must be provided
    if (!keyword && !location && !country && !category && !sportValue && !language) {
      return NextResponse.json(
        { error: 'At least one filter must be provided' },
        { status: 400 }
      );
    }

    const savedSearch = await SavedSearch.create({
      userId: user.userId,
      name: name || undefined,
      keyword: keyword || undefined,
      location: location || undefined,
      country: country || undefined,
      category: category || undefined,
      sport: sportValue || undefined, // Store as 'sport' in DB (backward compatible)
      language: language || undefined,
      frequency: frequency || 'weekly',
      active: true,
    });

    // Return with activity field (map sport back to activity for API consistency)
    const responseSearch = savedSearch.toObject();
    if (responseSearch.sport) {
      (responseSearch as any).activity = responseSearch.sport;
    }

    return NextResponse.json(
      {
        message: 'Saved search created successfully',
        savedSearch: responseSearch,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.error('[API /saved-searches POST] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

