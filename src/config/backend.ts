/**
 * 🔗 BACKEND CONFIGURATION
 * URL du backend Node.js (Auth Gateway) déployé sur AWS Lambda
 */

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function resolveBackendBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }

  if (typeof window !== 'undefined') {
    return normalizeUrl(window.location.origin);
  }

  return '';
}

export const backendConfig = {
  baseUrl: resolveBackendBaseUrl(),
};
