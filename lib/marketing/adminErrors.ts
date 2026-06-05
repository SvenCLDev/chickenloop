import { NextResponse } from 'next/server';

export function adminErrorResponse(error: unknown): NextResponse {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  if (errorMessage === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
    return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
  }
  if (errorMessage === 'Forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  console.error('[Admin marketing API]', error);
  return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 });
}
