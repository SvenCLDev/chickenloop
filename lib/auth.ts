import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';
import connectDB from './db';
import User from '@/models/User';
import Company from '@/models/Company';
import { isCompanyProfileComplete } from './companyProfile';

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

export function requireAuth(request: NextRequest): JWTPayload {
  const user = verifyAuth(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<JWTPayload> {
  const user = requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  await connectDB();
  const userDoc = await User.findById(user.userId).select('mustResetPassword companyId').lean();
  if (userDoc?.mustResetPassword) {
    throw new Error('PASSWORD_RESET_REQUIRED');
  }
  if (user.role === 'recruiter') {
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
        } else if (!isCompanyProfileComplete(company)) {
          throw new Error('COMPANY_PROFILE_INCOMPLETE');
        }
      }
    }
  }
  return user;
}

/** Recruiter auth that skips company completeness check (for complete-profile flow). */
export async function requireRecruiterAllowIncomplete(request: NextRequest): Promise<JWTPayload> {
  const user = requireAuth(request);
  if (user.role !== 'recruiter') {
    throw new Error('Forbidden');
  }
  await connectDB();
  const userDoc = await User.findById(user.userId).select('mustResetPassword companyId').lean();
  if (userDoc?.mustResetPassword) {
    throw new Error('PASSWORD_RESET_REQUIRED');
  }
  return user;
}

