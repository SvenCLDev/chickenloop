'use client';

import { useEffect } from 'react';

/**
 * Temporary debug instrumentation for job-page LCP (session 85d025).
 * Reports LCP breakdown-style timings to the local debug ingest.
 */
export default function JobLcpDebugProbe({ heroUrl }: { heroUrl?: string }) {
  useEffect(() => {
    const send = (message: string, data: Record<string, unknown>) => {
      // #region agent log
      fetch('http://127.0.0.1:7714/ingest/809469dc-4731-4443-a5ec-6d4761840282', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '85d025',
        },
        body: JSON.stringify({
          sessionId: '85d025',
          runId: 'post-fix',
          hypothesisId: 'LCP-delay',
          location: 'JobLcpDebugProbe.tsx',
          message,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };

    const highPri = [...document.querySelectorAll('img')].filter(
      (img) => img.fetchPriority === 'high'
    ).length;
    const preload = [
      ...document.querySelectorAll('link[rel="preload"][as="image"]'),
    ].map((l) => (l as HTMLLinkElement).href.slice(0, 120));

    send('job-page-mount', {
      heroUrl: heroUrl?.slice(0, 120),
      highPriImgCount: highPri,
      imagePreloads: preload,
    });

    try {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & {
          size?: number;
          url?: string;
          element?: Element;
        };
        if (!last) return;
        send('lcp-entry', {
          lcpMs: Math.round(last.startTime),
          size: last.size ?? null,
          url: last.url?.slice(0, 150) ?? null,
          tag: last.element?.tagName ?? null,
        });
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
      return () => po.disconnect();
    } catch {
      send('lcp-observer-unavailable', {});
    }
  }, [heroUrl]);

  return null;
}
