/** Run callback after the browser is idle, or after load / timeout fallback. */
export function deferUntilIdle(callback: () => void, timeoutMs = 3000): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const win = window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => win.cancelIdleCallback?.(id);
  }

  if (document.readyState === 'complete') {
    const id = globalThis.setTimeout(callback, 1);
    return () => globalThis.clearTimeout(id);
  }

  win.addEventListener('load', callback, { once: true });
  return () => win.removeEventListener('load', callback);
}
