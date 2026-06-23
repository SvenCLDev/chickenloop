import { NextResponse } from 'next/server';
import { getDistinctJobCategories } from '@/lib/jobCategoriesQuery';
import { CachePresets } from '@/lib/cache';

/** GET — distinct job categories used by published jobs (homepage search filter) */
export async function GET() {
  try {
    const categories = await getDistinctJobCategories();
    const cacheHeaders = CachePresets.short();

    return NextResponse.json({ categories }, { status: 200, headers: cacheHeaders });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /job-categories] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
