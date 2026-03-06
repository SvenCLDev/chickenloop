import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const blockedBots = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'CCBot',
  'Amazonbot',
];

const allowedBots = [
  'Googlebot',
  'Googlebot-News',
  'Googlebot-Image',
  'Googlebot-Video',
  'Bingbot',
  'DuckDuckBot',
  'Applebot',
];

export default async function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';

  if (allowedBots.some((bot) => userAgent.includes(bot))) {
    return NextResponse.next();
  }

  if (blockedBots.some((bot) => userAgent.includes(bot))) {
    return new NextResponse('Blocked bot', { status: 403 });
  }

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
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
