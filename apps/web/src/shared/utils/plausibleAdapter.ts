type PlausibleEventProps = Record<string, string | number | boolean>;

interface PlausibleFn {
  (event: string, options?: { props?: PlausibleEventProps }): void;
}

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

export function isPlausibleAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.plausible === 'function';
}

/**
 * Send a custom event to Plausible. No-ops silently when
 * window.plausible is not defined (script not loaded / blocked).
 */
export function trackPlausible(event: string, props?: PlausibleEventProps): void {
  if (!isPlausibleAvailable()) {
    return;
  }

  try {
    if (props && Object.keys(props).length > 0) {
      window.plausible!(event, { props });
    } else {
      window.plausible!(event);
    }
  } catch {
    // Analytics errors must never break the app
  }
}

export function getPlausibleConfig(): {
  domain: string | undefined;
  host: string | undefined;
  isConfigured: boolean;
} {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  const host = import.meta.env.VITE_PLAUSIBLE_HOST as string | undefined;
  return {
    domain,
    host,
    isConfigured: Boolean(domain && host),
  };
}
