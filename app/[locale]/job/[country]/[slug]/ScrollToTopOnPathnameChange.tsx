'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Soft navigations between /job/[country]/[slug] pages often keep the prior
 * scroll offset (user stays on "other jobs" cards). Reset to top on path change.
 */
export default function ScrollToTopOnPathnameChange() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
