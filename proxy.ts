import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add cache control headers to prevent stale content
  if (request.nextUrl.pathname.startsWith('/api')) {
    // API routes - no cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  } else {
    // Pages - revalidate frequently
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
