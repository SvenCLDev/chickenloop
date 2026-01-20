import jwt from 'jsonwebtoken';
import { EmailCategory } from './email';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const UNSUBSCRIBE_TOKEN_EXPIRY = '90d'; // Tokens expire after 90 days

export interface UnsubscribeTokenPayload {
  userId: string;
  category: EmailCategory;
  iat?: number;
  exp?: number;
}

/**
 * Generate a signed unsubscribe token
 * @param userId - User ID
 * @param category - Email category to unsubscribe from
 * @returns Signed JWT token
 */
export function generateUnsubscribeToken(userId: string, category: EmailCategory): string {
  const payload: Omit<UnsubscribeTokenPayload, 'iat' | 'exp'> = {
    userId,
    category,
  };

  return jwt.sign(payload, UNSUBSCRIBE_SECRET, { expiresIn: UNSUBSCRIBE_TOKEN_EXPIRY });
}

/**
 * Verify and decode an unsubscribe token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload {
  try {
    const decoded = jwt.verify(token, UNSUBSCRIBE_SECRET) as UnsubscribeTokenPayload;
    
    // Validate required fields
    if (!decoded.userId || !decoded.category) {
      throw new Error('Invalid token: missing required fields');
    }

    // Validate category is a valid EmailCategory
    if (!Object.values(EmailCategory).includes(decoded.category)) {
      throw new Error('Invalid token: invalid category');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Generate unsubscribe URL
 * @param userId - User ID
 * @param category - Email category
 * @returns Full unsubscribe URL
 */
export function generateUnsubscribeUrl(userId: string, category: EmailCategory): string {
  const token = generateUnsubscribeToken(userId, category);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return `${baseUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
