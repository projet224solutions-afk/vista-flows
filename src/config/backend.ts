/**
 * 🔗 BACKEND CONFIGURATION
 * URL du backend Node.js (Auth Gateway) déployé sur AWS Lambda
 */

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function isLoopbackHttpUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

function resolveBackendBaseUrl(): string {
  // 1. Mobile-specific URL takes highest priority (Capacitor/native context)
  const mobileUrl = import.meta.env.VITE_BACKEND_MOBILE_URL?.trim();
  if (mobileUrl) {
    return normalizeUrl(mobileUrl);
  }

  const configuredUrl = (
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_API_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL
  )?.trim();

  // In local dev, prefer Vite proxy for localhost backends to avoid CORS issues
  // when the dev server port changes (e.g. 8080 -> 8081).
  if (
    import.meta.env.DEV &&
    configuredUrl &&
    isLoopbackHttpUrl(configuredUrl)
  ) {
    return '';
  }

  if (configuredUrl) {
    // Prevent accidental production builds pointing to localhost.
    if (
      !import.meta.env.DEV &&
      isLoopbackHttpUrl(configuredUrl) &&
      typeof window !== 'undefined' &&
      !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ) {
      console.warn('[backendConfig] URL backend locale ignorée en production', { configuredUrl });
      return '';
    }

    return normalizeUrl(configuredUrl);
  }

  if (import.meta.env.DEV) {
    // Keep relative paths in dev to support Vite proxy and LAN/mobile testing.
    return '';
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    // Native WebViews (Capacitor iOS: capacitor://localhost, Android: http://localhost)
    // must NOT use the local WebView origin as the API base — it doesn't route to the backend.
    if (/^capacitor:\/\//i.test(origin) || /^ionic:\/\//i.test(origin)) {
      // Native app without VITE_BACKEND_MOBILE_URL set: API calls will fail gracefully.
      return '';
    }
    if (/^http:\/\/localhost(:\d+)?$/i.test(origin) && !import.meta.env.DEV) {
      // Android WebView serves from http://localhost — same issue, no backend there.
      return '';
    }

    // Standard HTTPS origin (web deployment) — use relative API calls.
    if (/^https?:\/\//i.test(origin)) {
      return normalizeUrl(origin);
    }
  }

  return '';
}

export const backendConfig = {
  baseUrl: resolveBackendBaseUrl(),
};
