/**
 * NextAuth App Router handler. OAuth behavior (Google linking, user.id safety) lives in `@/lib/nextAuth`.
 */
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/nextAuth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

