/**
 * Authentication utilities for Next.js API routes
 * 
 * This module provides helper functions to authenticate and authorize users
 * in API routes. It supports both cookie-based and header-based authentication,
 * allowing tokens to be sent via Authorization header or HTTP-only cookies.
 */

import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';

/**
 * Extended NextRequest interface that includes authenticated user information.
 * Used in API routes to access the current user's data.
 */
export interface AuthRequest extends NextRequest {
  /** The authenticated user's JWT payload, if available */
  user?: JWTPayload;
}

/**
 * Extracts the JWT token from a Next.js request.
 * 
 * Checks two locations in order:
 * 1. Authorization header (Bearer token format)
 * 2. HTTP-only cookie named 'token'
 * 
 * @param request - The Next.js request object
 * @returns The JWT token string, or null if not found
 * 
 * @example
 * ```typescript
 * const token = getTokenFromRequest(request);
 * if (token) {
 *   // Token found, proceed with verification
 * }
 * ```
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check cookies
  const token = request.cookies.get('token')?.value;
  return token || null;
}

/**
 * Verifies authentication for a request without throwing errors.
 * 
 * Attempts to extract and verify the JWT token from the request.
 * Returns null instead of throwing errors, making it suitable for
 * optional authentication scenarios.
 * 
 * @param request - The Next.js request object
 * @returns The decoded JWT payload if authentication succeeds, null otherwise
 * 
 * @example
 * ```typescript
 * const user = verifyAuth(request);
 * if (user) {
 *   // User is authenticated
 *   console.log(`Authenticated as ${user.email}`);
 * } else {
 *   // User is not authenticated (token missing or invalid)
 * }
 * ```
 */
export function verifyAuth(request: NextRequest): JWTPayload | null {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return null;
    }
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Requires authentication for a request, throwing an error if not authenticated.
 * 
 * Use this function in API routes that require authentication.
 * Throws an 'Unauthorized' error if the user is not authenticated,
 * which should be caught and converted to a 401 response.
 * 
 * @param request - The Next.js request object
 * @returns The decoded JWT payload
 * @throws Error with message 'Unauthorized' if authentication fails
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   try {
 *     const user = requireAuth(request);
 *     // User is authenticated, proceed with protected logic
 *     return NextResponse.json({ userId: user.userId });
 *   } catch (error) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 * }
 * ```
 */
export function requireAuth(request: NextRequest): JWTPayload {
  const user = verifyAuth(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Requires authentication and specific role(s) for a request.
 * 
 * Use this function in API routes that require specific user roles
 * (e.g., admin-only or recruiter-only endpoints). Throws errors if
 * the user is not authenticated or doesn't have an allowed role.
 * 
 * @param request - The Next.js request object
 * @param allowedRoles - Array of role strings that are permitted
 * @returns The decoded JWT payload
 * @throws Error with message 'Unauthorized' if not authenticated
 * @throws Error with message 'Forbidden' if user role is not in allowedRoles
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   try {
 *     // Only allow admin and recruiter roles
 *     const user = requireRole(request, ['admin', 'recruiter']);
 *     // User is authenticated and has correct role
 *     return NextResponse.json({ data: 'sensitive data' });
 *   } catch (error) {
 *     const status = error.message === 'Unauthorized' ? 401 : 403;
 *     return NextResponse.json({ error: error.message }, { status });
 *   }
 * }
 * ```
 */
export function requireRole(request: NextRequest, allowedRoles: string[]): JWTPayload {
  const user = requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
}

