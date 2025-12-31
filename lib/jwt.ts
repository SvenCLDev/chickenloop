/**
 * JWT (JSON Web Token) utility functions for authentication
 * 
 * This module provides functions to generate and verify JWT tokens used for
 * user authentication across the ChickenLoop platform. Tokens contain user
 * identification and role information, and are valid for 7 days.
 */

import jwt from 'jsonwebtoken';
import { IUser } from '@/models/User';

/**
 * Secret key used to sign and verify JWT tokens.
 * Should be set in environment variables for production.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Payload structure contained within JWT tokens.
 * This information is encoded in the token and can be extracted upon verification.
 */
export interface JWTPayload {
  /** MongoDB ObjectId of the user as a string */
  userId: string;
  /** User's email address */
  email: string;
  /** User's role: 'recruiter', 'job-seeker', or 'admin' */
  role: string;
}

/**
 * Generates a JWT token for a user.
 * 
 * Creates a signed JWT token containing the user's ID, email, and role.
 * The token is valid for 7 days and can be used for API authentication.
 * 
 * @param user - The user document from MongoDB
 * @returns A signed JWT token string
 * 
 * @example
 * ```typescript
 * const user = await User.findById(userId);
 * const token = generateToken(user);
 * // Use token in Authorization header or cookies
 * ```
 */
export function generateToken(user: IUser): string {
  const payload: JWTPayload = {
    userId: (user._id as any).toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies and decodes a JWT token.
 * 
 * Validates the token's signature and expiration, then returns the decoded payload.
 * Throws an error if the token is invalid, expired, or tampered with.
 * 
 * @param token - The JWT token string to verify
 * @returns The decoded JWT payload containing user information
 * @throws Error if token is invalid or expired
 * 
 * @example
 * ```typescript
 * try {
 *   const payload = verifyToken(token);
 *   console.log(`User ${payload.email} is authenticated`);
 * } catch (error) {
 *   console.error('Invalid token');
 * }
 * ```
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

