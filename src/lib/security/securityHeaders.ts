/**
 * Headers de sécurité HTTP complets
 * Protection contre diverses attaques web
 */

export const SECURITY_HEADERS = {
  // Content Security Policy - Empêche XSS
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://djomy.com https://api.djomy.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Empêcher le navigateur de deviner le MIME type
  'X-Content-Type-Options': 'nosniff',
  
  // Protection XSS intégrée du navigateur
  'X-XSS-Protection': '1; mode=block',
  
  // Empêcher l'affichage dans une iframe (clickjacking)
  'X-Frame-Options': 'DENY',
  
  // Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Contrôle ce que le navigateur envoie comme referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Politique de permissions
  'Permissions-Policy': [
    'geolocation=(self)',
    'microphone=()',
    'camera=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', ')
};

/**
 * Headers pour Edge Functions Supabase
 */
export const getEdgeFunctionSecurityHeaders = (origin?: string) => {
  const ALLOWED_ORIGINS = [
    'https://224solution.net',
    'https://www.224solution.net',
    'http://localhost:8080',
    'http://localhost:5173'
  ];
  
  const corsOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];
  
  return {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24h cache preflight
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };
};

/**
 * Appliquer headers de sécurité à une réponse
 */
export const applySecurityHeaders = (response: Response, origin?: string): Response => {
  const headers = getEdgeFunctionSecurityHeaders(origin);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
};
