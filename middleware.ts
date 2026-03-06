import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const blockedBots = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "CCBot",
  "Amazonbot",
];

const allowedBots = [
  "Googlebot",
  "Googlebot-News",
  "Googlebot-Image",
  "Googlebot-Video",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";

  if (allowedBots.some((bot) => userAgent.includes(bot))) {
    return NextResponse.next();
  }

  if (blockedBots.some((bot) => userAgent.includes(bot))) {
    return new NextResponse("Blocked bot", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
