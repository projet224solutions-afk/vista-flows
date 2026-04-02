/**
 * 🔗 BACKEND CONFIGURATION
 * URL du backend Node.js (Auth Gateway) déployé sur AWS Lambda
 */

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function resolveBackendBaseUrl(): string {
  const configuredUrl =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_API_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_MOBILE_URL;

  // In local dev, prefer Vite proxy for localhost backends to avoid CORS issues
  // when the dev server port changes (e.g. 8080 -> 8081).
  if (
    import.meta.env.DEV &&
    configuredUrl &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredUrl)
  ) {
    return '';
  }

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (import.meta.env.DEV) {
    // Keep relative paths in dev to support Vite proxy and LAN/mobile testing.
    return '';
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    // Native WebViews may expose non-http origins (capacitor://, ionic://, file://).
    if (/^https?:\/\//i.test(origin)) {
      return normalizeUrl(origin);
    }
  }

  return '';
}

export const backendConfig = {
  baseUrl: resolveBackendBaseUrl(),
};
