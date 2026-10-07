import { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import User from '@/models/User';
import Company from '@/models/Company';
import { evaluateCompanyCompletion } from '@/lib/companyCompletion';

interface RecruiterLayoutProps {
  children: ReactNode;
}

export default async function RecruiterLayout({ children }: RecruiterLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload.role === 'recruiter') {
        await connectDB();
        const recruiter = await User.findById(payload.userId).select('companyId role').lean();
        if (recruiter?.companyId) {
          const company = await Company.findById(recruiter.companyId).lean();
          if (company) {
            const completion = evaluateCompanyCompletion(company);
            const headerList = await headers();
            const pathname =
              headerList.get('next-url') ||
              headerList.get('x-invoke-path') ||
              '';
            const isSetupPage =
              pathname.startsWith('/company/setup') ||
              pathname.startsWith('/recruiter/company/new');
            if (!completion.isComplete && !isSetupPage) {
              redirect('/company/setup');
            }
          }
        }
      }
    } catch {
      // Ignore invalid token and allow client-side auth handling.
    }
  }

  return <>{children}</>;
}
