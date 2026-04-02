import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { verifyToken, JWTPayload } from './jwt';
import connectDB from './db';
import User from '@/models/User';
import Company from '@/models/Company';
import { getCompanyProfileIncompleteReason } from './companyProfile';

/** Reject providerAccountId-like strings; only accept real 24-hex ObjectIds. */
function isMongoObjectIdString(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id) && mongoose.Types.ObjectId.isValid(id);
}

export interface AuthRequest extends NextRequest {
  user?: JWTPayload;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check cookies
  const token = request.cookies.get('token')?.value;
  return token || null;
}

export function verifyAuth(request: NextRequest): JWTPayload | null {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return null;
    }
    return verifyToken(token);
  } catch {
    return null;
  }
}

const SECURE_NEXT_AUTH_SESSION = '__Secure-next-auth.session-token';
const PLAIN_NEXT_AUTH_SESSION = 'next-auth.session-token';

/** Join chunked NextAuth session cookies (same logic as next-auth SessionStore). */
function joinNextAuthSessionCookieValue(
  cookies: { name: string; value: string }[],
  prefix: string
): string | null {
  const matching = cookies.filter((c) => c.name === prefix || c.name.startsWith(`${prefix}.`));
  if (matching.length === 0) return null;
  const sorted = matching.sort((a, b) => {
    if (a.name === prefix) return -1;
    if (b.name === prefix) return 1;
    const na = parseInt(a.name.split('.').pop() ?? '0', 10);
    const nb = parseInt(b.name.split('.').pop() ?? '0', 10);
    return na - nb;
  });
  return sorted.map((c) => c.value).join('');
}

/**
 * Read NextAuth JWT from the incoming request.
 * If `NEXTAUTH_URL` is mis-set (e.g. http://localhost in production), default `getToken`
 * looks for the wrong cookie name while the browser only has `__Secure-next-auth.session-token`.
 */
async function getNextAuthJwtPayload(
  request: NextRequest,
  secret: string
): Promise<Record<string, unknown> | null> {
  const { getToken, decode } = await import('next-auth/jwt');
  const cookieList = typeof request.cookies.getAll === 'function' ? request.cookies.getAll() : [];

  const hasSecureSession = cookieList.some((c) => c.name.startsWith(SECURE_NEXT_AUTH_SESSION));
  const hasPlainSession = cookieList.some(
    (c) => c.name.startsWith(PLAIN_NEXT_AUTH_SESSION) && !c.name.startsWith('__')
  );

  const tryDecode = async (secureCookie: boolean) =>
    getToken({
      req: request as any,
      secret,
      secureCookie,
      cookieName: secureCookie ? SECURE_NEXT_AUTH_SESSION : PLAIN_NEXT_AUTH_SESSION,
    });

  if (hasSecureSession) {
    const t = await tryDecode(true);
    if (t) return t as Record<string, unknown>;
  }
  if (hasPlainSession) {
    const t = await tryDecode(false);
    if (t) return t as Record<string, unknown>;
  }

  let t = await tryDecode(true);
  if (t) return t as Record<string, unknown>;
  t = await tryDecode(false);
  if (t) return t as Record<string, unknown>;

  const rawSecure = joinNextAuthSessionCookieValue(cookieList, SECURE_NEXT_AUTH_SESSION);
  if (rawSecure) {
    try {
      const payload = await decode({ token: rawSecure, secret });
      if (payload) return payload as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  const rawPlain = joinNextAuthSessionCookieValue(cookieList, PLAIN_NEXT_AUTH_SESSION);
  if (rawPlain) {
    try {
      const payload = await decode({ token: rawPlain, secret });
      if (payload) return payload as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }

  return null;
}

export async function verifyAuthIncludingNextAuth(request: NextRequest): Promise<JWTPayload | null> {
  /**
   * NextAuth MUST take precedence over the legacy `token` cookie when both are present.
   * Otherwise a stale JWT from another session/user wins and /api/auth/me flips between
   * identities (recruiter ↔ job-seeker redirect loop).
   *
   * Role always comes from the DB for the resolved user (never trust stale JWT role claims).
   */
  const nextSecret = process.env.NEXTAUTH_SECRET;
  if (nextSecret) {
    try {
      const naToken = await getNextAuthJwtPayload(request, nextSecret);
      if (naToken) {
        const email = typeof naToken.email === 'string' ? naToken.email.trim().toLowerCase() : '';
        const uidFromJwt =
          typeof (naToken as { userId?: string }).userId === 'string'
            ? (naToken as { userId?: string }).userId
            : undefined;

        await connectDB();
        let userDoc: { _id: unknown; email?: string; role?: string | null } | null = null;

        if (uidFromJwt && isMongoObjectIdString(uidFromJwt)) {
          userDoc = await User.findById(uidFromJwt).select('email role').lean();
        }
        if (!userDoc && email) {
          userDoc = await User.findOne({ email }).select('email role').lean();
        }

        if (userDoc?._id != null) {
          const roleStr = userDoc.role != null ? String(userDoc.role) : '';
          return {
            userId: String(userDoc._id),
            role: roleStr,
            email: userDoc.email ?? email,
          } as JWTPayload;
        }
      }
    } catch {
      // fall through to legacy
    }
  }

  const legacy = verifyAuth(request);
  if (legacy) {
    await connectDB();
    const fromDb = await User.findById(legacy.userId).select('email role').lean();
    if (fromDb?._id) {
      const roleStr = fromDb.role != null ? String(fromDb.role) : '';
      return {
        userId: String(fromDb._id),
        role: roleStr,
        email: fromDb.email ?? legacy.email,
      } as JWTPayload;
    }
    return legacy;
  }

  return null;
}

export function requireAuth(request: NextRequest): JWTPayload {
  const user = verifyAuth(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/** Use in route handlers: supports legacy JWT and NextAuth (Google OAuth). Prefer over `requireAuth`. */
export async function requireAuthAsync(request: NextRequest): Promise<JWTPayload> {
  const user = await verifyAuthIncludingNextAuth(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export interface RequireRoleOptions {
  /** Skip company completeness check (for company setup routes) */
  skipCompanyProfileCheck?: boolean;
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[],
  options?: RequireRoleOptions
): Promise<JWTPayload> {
  const user = await verifyAuthIncludingNextAuth(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  await connectDB();
  const userDoc = await User.findById(user.userId).select('mustResetPassword companyId').lean() as { mustResetPassword?: boolean; companyId?: unknown } | null;
  if (userDoc?.mustResetPassword) {
    throw new Error('PASSWORD_RESET_REQUIRED');
  }
  // Update lastOnline so "last logged in" is accurate on candidate cards and elsewhere
  await User.updateOne(
    { _id: user.userId },
    { $set: { lastOnline: new Date() } }
  ).catch(() => { /* ignore update errors */ });
  if (user.role === 'recruiter' && !options?.skipCompanyProfileCheck) {
    const path = new URL(request.url).pathname;
    const bypassCompanyMissing =
      path.startsWith('/recruiter/company/new') || path.startsWith('/api/company');
    if (path.includes('/complete-company-profile')) {
      // Skip company enforcement
    } else {
      if (!userDoc?.companyId) {
        if (!bypassCompanyMissing) throw new Error('COMPANY_MISSING');
      } else {
        const company = await Company.findById(userDoc.companyId).lean();
        if (!company) {
          if (!bypassCompanyMissing) throw new Error('COMPANY_MISSING');
        } else {
          const reason = getCompanyProfileIncompleteReason(company);
          if (reason) {
            const err = new Error('COMPANY_PROFILE_INCOMPLETE');
            (err as Error & { detail?: string }).detail = reason;
            throw err;
          }
        }
      }
    }
  }
  return user;
}

/** Build 403 response for COMPANY_PROFILE_INCOMPLETE with optional detail. */
export function companyProfileIncompleteResponse(error: unknown): { error: string; detail?: string } | null {
  if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
    const detail = (error as Error & { detail?: string }).detail;
    return { error: 'COMPANY_PROFILE_INCOMPLETE', detail };
  }
  return null;
}

/** Recruiter auth that skips company completeness check (for complete-profile flow). */
export async function requireRecruiterAllowIncomplete(request: NextRequest): Promise<JWTPayload> {
  const user = await verifyAuthIncludingNextAuth(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (user.role !== 'recruiter') {
    throw new Error('Forbidden');
  }
  await connectDB();
  const userDoc = await User.findById(user.userId).select('mustResetPassword companyId').lean() as { mustResetPassword?: boolean; companyId?: unknown } | null;
  if (userDoc?.mustResetPassword) {
    throw new Error('PASSWORD_RESET_REQUIRED');
  }
  await User.updateOne(
    { _id: user.userId },
    { $set: { lastOnline: new Date() } }
  ).catch(() => {});
  return user;
}

