'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApi, companyApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { setApiRouter } from '@/lib/apiRouterRef';
import { signOut } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'recruiter' | 'job-seeker' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string, turnstileToken?: string | null, website?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialAuthCheckedRef = useRef(false);
  const router = useRouter();

  const setUserIfChanged = useCallback((nextUser: User | null) => {
    setUser((prev) => {
      const same =
        prev?.id === nextUser?.id &&
        prev?.email === nextUser?.email &&
        prev?.name === nextUser?.name &&
        prev?.role === nextUser?.role;
      return same ? prev : nextUser;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUserIfChanged(data.user ?? null);
    } catch (error: any) {
      // 401 is expected when user is not logged in - keep it silent and stable.
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setUserIfChanged(null);
      } else {
        // Log other errors but don't break the app
        console.error('Error refreshing user:', error);
        setUserIfChanged(null);
      }
    } finally {
      setLoading(false);
    }
  }, [setUserIfChanged]);

  useEffect(() => {
    setApiRouter(router);
    return () => setApiRouter(null);
  }, [router]);

  useEffect(() => {
    // React Strict Mode can run effects twice in development.
    // Avoid duplicate /api/auth/me calls during initial page load.
    if (initialAuthCheckedRef.current) {
      return;
    }
    initialAuthCheckedRef.current = true;
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login({ email, password });
      setUser(data.user);

      // Check if recruiter has a company
      if (data.user.role === 'recruiter') {
        try {
          await companyApi.get();
          // Company exists, go to recruiter dashboard
          router.push('/recruiter');
        } catch (error) {
          // Company doesn't exist, redirect to company creation
          router.push('/recruiter/company/new');
        }
      } else {
        // Admin or job-seeker
        router.push(`/${data.user.role === 'admin' ? 'admin' : 'job-seeker'}`);
      }
    } catch (err: any) {
      if (err.message === 'PASSWORD_RESET_REQUIRED') {
        router.push(`/reset-password-required?email=${encodeURIComponent(email)}`);
        return;
      }
      throw err;
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: string,
    turnstileToken?: string | null,
    website?: string
  ) => {
    const data = await authApi.register({ email, password, name, role, turnstileToken, website });
    setUser(data.user);
    
    // Check if recruiter has a company (new recruiters won't have one)
    if (data.user.role === 'recruiter') {
      // New recruiter, always redirect to company creation
      router.push('/recruiter/company/new');
    } else {
      // Admin or job-seeker
      router.push(`/${data.user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    }
  };

  const logout = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // Still clear legacy session if NextAuth sign-out fails
    }
    await authApi.logout();
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

