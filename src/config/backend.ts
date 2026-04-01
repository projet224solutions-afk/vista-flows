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
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_MOBILE_URL;

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
