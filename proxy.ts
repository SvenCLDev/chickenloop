import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const blockedBots = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'CCBot',
  'Amazonbot',
];

const allowedBots = [
  'Googlebot',
  'Googlebot-News',
  'Googlebot-Image',
  'Googlebot-Video',
  'Google-Extended',
  'Bingbot',
  'DuckDuckBot',
  'Applebot',
  // AI search / citation crawlers (GEO)
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'OAI-SearchBot',
  // Meta / Facebook – required for Instagram Graph API image fetching, link previews, platform integrations
  'facebookexternalhit',
  'Facebot',
  'meta-externalagent',
];

export default async function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';

  if (allowedBots.some((bot) => userAgent.includes(bot))) {
    // Still run locale routing for crawlers so /en|/de|/es resolve correctly.
  } else if (blockedBots.some((bot) => userAgent.includes(bot))) {
    return new NextResponse('Blocked bot', { status: 403 });
  }

  const response = handleI18nRouting(request);

  // Add cache control headers to prevent stale content
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
  } else {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=10, stale-while-revalidate=59'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except:
     * - api, _next, _vercel
     * - files with an extension (favicon.ico, robots.txt, sitemap.xml, images, etc.)
     */
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
