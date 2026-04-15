'use client';

import type { ReactNode } from 'react';
import { RecruiterNewJobProvider } from './RecruiterNewJobContext';

export default function RecruiterNewJobLayout({ children }: { children: ReactNode }) {
  return <RecruiterNewJobProvider>{children}</RecruiterNewJobProvider>;
}
