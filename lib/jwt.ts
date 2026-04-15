import jwt from 'jsonwebtoken';
import { IUser } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateToken(user: IUser): string {
  if (!user.email || !user.role) {
    throw new Error('Cannot generate token: user is missing email or role');
  }
  const payload: JWTPayload = {
    userId: String(user._id),
    email: user.email,
    role: String(user.role),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

