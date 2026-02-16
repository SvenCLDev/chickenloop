import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { loadCVs } from '@/lib/loadCVs';
import { parseCandidateSearchParams } from '@/lib/candidateSearchParams';

// GET - Get all CVs (recruiters and admins only)
export async function GET(request: NextRequest) {
  console.log('API: /api/candidates-list called');
  try {
    const user = await requireRole(request, ['recruiter', 'admin']);
    console.log('API: /api/candidates-list - User authorized:', user.email);

    const { searchParams } = new URL(request.url);
    const filters = parseCandidateSearchParams(searchParams);
    console.log('API: /api/candidates-list - Querying CVs with filters:', {
      featured: searchParams.get('featured') || null,
      kw: filters.kw || null,
      location: filters.location || null,
      workArea: filters.workArea || null,
      language: filters.language || null,
      sport: filters.sport || null,
      certification: filters.certification || null,
      experienceLevel: filters.experienceLevel || null,
      availability: filters.availability || null,
      page: filters.page || null,
      sort: filters.sort || null,
    });

    const startTime = Date.now();
    const result = await loadCVs({ searchParams });
    const queryTime = Date.now() - startTime;
    console.log(`API: /api/candidates-list - Found ${result.cvs.length} CVs (page ${result.pagination.page}, total ${result.pagination.total}) in ${queryTime}ms`);

    return NextResponse.json({
      cvs: result.cvs,
      filters: result.filters,
      pagination: result.pagination,
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API: /api/candidates-list - Error:', error);
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

