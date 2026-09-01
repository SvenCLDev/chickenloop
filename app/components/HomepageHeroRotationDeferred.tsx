'use client';

import { useEffect, useState } from 'react';
import { deferUntilIdle } from '@/lib/deferUntilIdle';
import HomepageHeroRotation from './HomepageHeroRotation';

export default function HomepageHeroRotationDeferred() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return deferUntilIdle(() => setReady(true), 4000);
  }, []);

  if (!ready) return null;

  return <HomepageHeroRotation />;
}
