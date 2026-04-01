import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import connectDB from '@/lib/db';
import User from '@/models/User';

/** Only trust strings that are real MongoDB ObjectIds (never providerAccountId). */
function isValidUserObjectId(id: string | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  if (!/^[a-fA-F0-9]{24}$/.test(id)) return false;
  return ObjectId.isValid(id);
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/onboarding/role',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // After app logout, Google still has a session for the last account; without this,
      // OAuth silently reuses it and users cannot pick a different Google account.
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Safe automatic Google account linking by email:
     * - Only links when Google reports the email is verified.
     * - If a user already exists with the same email, we attach the Google provider ID (and ensure an Account doc exists)
     *   so NextAuth won't throw OAuthAccountNotLinked.
     * - Preserves existing credentials login and user data (role, etc.).
     */
    async signIn({ user, account, profile }) {
      const provider = account?.provider;
      if (provider !== 'google') return true;

      const providerAccountId = account?.providerAccountId;
      const googleProfile = profile as { email?: string; email_verified?: boolean } | undefined;
      /**
       * Authoritative email for this OAuth response is Google's profile (verified), not `user.email`.
       * The MongoDB adapter often sets `user.email` from the linked User document in the DB, which can
       * be stale or wrong vs. what Google returns today — do not reject sign-in based on that mismatch.
       */
      const canonicalEmail = googleProfile?.email?.trim().toLowerCase() || '';
      const emailFromAdapter = user?.email?.trim().toLowerCase() || '';

      console.log('[NextAuth] Google login attempt:', {
        emailFromAdapter,
        canonicalEmail,
        providerAccountId,
        emailVerified: googleProfile?.email_verified,
      });

      // Require email and verified email from Google (security requirement).
      if (!providerAccountId || !canonicalEmail) return false;
      if (googleProfile?.email_verified !== true) return false;

      await connectDB();
      const client = await clientPromise;
      const db = client.db();

      /**
       * Never overwrite `User.email` from Google OAuth — that caused two Google identities to
       * mutate the same recruiter row. Session identity must follow Mongo `userId`, not Google's email.
       */
      let existingAccount = await db.collection('accounts').findOne({
        provider: 'google',
        providerAccountId,
      });

      if (existingAccount?.userId) {
        const mislinkedUserId = existingAccount.userId;
        const linked = await User.findById(mislinkedUserId).select('email name providers').lean();
        if (!linked) {
          console.error('[NextAuth] Google account links to missing user', { providerAccountId });
          return false;
        }

        const linkedEmail = linked.email?.trim().toLowerCase() ?? '';
        if (linkedEmail === canonicalEmail) {
          (user as { id?: string; email?: string | null }).id = String(mislinkedUserId);
          (user as { email?: string | null }).email = linked.email;
          return true;
        }

        const emailOwner = await User.findOne({ email: canonicalEmail })
          .select('_id name role providers')
          .lean();

        if (!emailOwner) {
          // Wrong link + no ChickenLoop user for this Google email: unlink only (do not change User.email).
          await db.collection('accounts').deleteOne({ provider: 'google', providerAccountId });
          await User.updateOne({ _id: mislinkedUserId }, { $unset: { 'providers.google': '' } });
          existingAccount = null;
        } else {
          const ownerGoogleRaw = (emailOwner as { providers?: { google?: { id?: string } } })?.providers
            ?.google?.id;
          const ownerGoogleId = typeof ownerGoogleRaw === 'string' ? ownerGoogleRaw : null;

          if (ownerGoogleId && ownerGoogleId !== providerAccountId) {
            console.error('[NextAuth] Email owner already has a different Google id; refusing', {
              canonicalEmail,
              ownerGoogleId,
              providerAccountId,
            });
            return false;
          }

          await db.collection('accounts').updateOne(
            { provider: 'google', providerAccountId },
            { $set: { userId: emailOwner._id } }
          );

          await User.updateOne({ _id: mislinkedUserId }, { $unset: { 'providers.google': '' } });

          const setOnOwner: Record<string, unknown> = {
            'providers.google.id': providerAccountId,
          };
          if (!emailOwner.name && user.name) setOnOwner.name = user.name;
          await User.updateOne({ _id: emailOwner._id }, { $set: setOnOwner });

          const ownerDoc = await User.findById(emailOwner._id).select('email').lean();
          (user as { id?: string; email?: string | null }).id = emailOwner._id.toString();
          (user as { email?: string | null }).email = ownerDoc?.email ?? emailOwner.email;

          console.log('[NextAuth] Reassigned Google account to user matching verified email', {
            fromUserId: String(mislinkedUserId),
            toUserId: String(emailOwner._id),
            canonicalEmail,
          });
          return true;
        }
      }

      const existingUser = await User.findOne({ email: canonicalEmail })
        .select('_id name role providers')
        .lean();

      // New email: let MongoDBAdapter create the user. Never use user.id as Mongo _id here —
      // it may be Google providerAccountId before the adapter runs.
      if (!existingUser) {
        const rawId = (user as any)?.id as string | undefined;
        if (rawId && !isValidUserObjectId(rawId)) {
          console.warn(
            '[NextAuth] Stripping invalid user.id (not a Mongo ObjectId):',
            rawId
          );
          delete (user as any).id;
        }
        console.log('[NextAuth] New Google user — adapter will create user');
        return true;
      }

      // Existing user found by email. Only link if:
      // - user has no google id yet, OR it matches this providerAccountId.
      const alreadyLinkedId =
        typeof (existingUser as any)?.providers?.google?.id === 'string'
          ? (existingUser as any).providers.google.id
          : null;

      if (alreadyLinkedId && alreadyLinkedId !== providerAccountId) {
        console.error('[NextAuth] Existing user has different Google id; refusing to link', {
          email: canonicalEmail,
          existingGoogleId: alreadyLinkedId,
          attemptedGoogleId: providerAccountId,
        });
        return false;
      }

      // Link Google provider id on the user doc (non-destructive).
      const update: Record<string, unknown> = {
        'providers.google.id': providerAccountId,
      };
      if (!existingUser.name && user.name) update.name = user.name;
      await User.updateOne({ _id: existingUser._id }, { $set: update });

      // Create the Account row so NextAuth won't throw OAuthAccountNotLinked.
      // Also ensure we never attach this providerAccountId to a *different* user.
      await db.collection('accounts').updateOne(
        { provider: 'google', providerAccountId },
        {
          $setOnInsert: {
            userId: existingUser._id,
            type: account.type ?? 'oauth',
            provider: 'google',
            providerAccountId,
          },
        },
        { upsert: true }
      );

      // Only ever assign Mongo _id string (never providerAccountId).
      (user as any).id = existingUser._id.toString();
      (user as { email?: string | null }).email = existingUser.email;
      return true;
    },
    async jwt({ token, user }) {
      /**
       * Prefer Mongo `userId` / signIn `user.id` — never resolve OAuth sessions by Google email alone,
       * or two Google accounts that share a mis-linked row will flip `User.email` and map to one account.
       */
      await connectDB();

      if (user && typeof (user as { id?: string }).id === 'string') {
        const uid = (user as { id: string }).id;
        if (isValidUserObjectId(uid)) {
          const userDoc = await User.findById(uid).select('_id role email').lean();
          if (userDoc) {
            token.userId = String(userDoc._id);
            (token as { id?: string }).id = token.userId;
            token.role = (userDoc.role ?? null) as string | null;
            token.email = userDoc.email?.trim().toLowerCase() ?? undefined;
            return token;
          }
        }
      }

      const fromToken = typeof token.userId === 'string' ? token.userId : null;
      if (fromToken && isValidUserObjectId(fromToken)) {
        const userDoc = await User.findById(fromToken).select('_id role email').lean();
        if (userDoc) {
          token.userId = String(userDoc._id);
          (token as { id?: string }).id = token.userId;
          token.role = (userDoc.role ?? null) as string | null;
          token.email = userDoc.email?.trim().toLowerCase() ?? undefined;
          return token;
        }
      }

      const email = typeof token.email === 'string' ? token.email.trim().toLowerCase() : null;
      if (email) {
        const userDoc = await User.findOne({ email }).select('_id role email').lean();
        if (userDoc) {
          token.userId = String(userDoc._id);
          (token as { id?: string }).id = token.userId;
          token.role = (userDoc.role ?? null) as string | null;
          token.email = userDoc.email?.trim().toLowerCase() ?? undefined;
          return token;
        }
      }

      if (user && typeof (user as { id?: string }).id === 'string') {
        const uid = (user as { id: string }).id;
        if (isValidUserObjectId(uid)) {
          token.userId = uid;
          (token as { id?: string }).id = uid;
        } else {
          console.error('[NextAuth] Ignoring invalid user.id in jwt callback:', uid);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === 'string' ? token.userId : undefined;
        session.user.role = typeof token.role === 'string' ? token.role : null;
        if (typeof token.email === 'string') {
          session.user.email = token.email;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Enforce a post-login hop that will send users without a role to onboarding.
      // This ensures Google logins still hit role gating even if callbackUrl wasn't provided.
      try {
        const u = new URL(url, baseUrl);
        if (u.origin !== new URL(baseUrl).origin) return baseUrl;
        const path = u.pathname || '/';
        if (path === '/' || path === '/login') {
          return `${baseUrl}/auth/post-login`;
        }
        return u.toString();
      } catch {
        return `${baseUrl}/auth/post-login`;
      }
    },
  },
};

