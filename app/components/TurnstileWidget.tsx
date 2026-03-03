'use client';

import { useEffect, useRef, useState } from 'react';

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      ready: (fn: () => void) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string | null) => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  /** When this key changes, the widget is reset (e.g. after successful submit). */
  resetKey?: number;
}

export default function TurnstileWidget({
  siteKey,
  onVerify,
  theme = 'light',
  size = 'normal',
  resetKey = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!siteKey || typeof window === 'undefined') return;

    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`);
    if (existing) {
      if (window.turnstile) setScriptLoaded(true);
      else existing.addEventListener('load', () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    // Do not use async/defer when using turnstile.ready() – Cloudflare requires sync load for ready().
    // We use onload only (no ready()), so async is fine.
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [siteKey]);

  useEffect(() => {
    if (!scriptLoaded || !window.turnstile || !containerRef.current || !siteKey) return;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token) => onVerifyRef.current(token),
        'expired-callback': () => onVerifyRef.current(null),
        'error-callback': () => onVerifyRef.current(null),
      });
      widgetIdRef.current = id;
    };

    // Render directly; avoid turnstile.ready() so we can load the script with async
    renderWidget();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, theme, size, resetKey]);

  if (!siteKey) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
        CAPTCHA not configured. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-start" />;
}
