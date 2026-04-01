/**
 * 🔧 ENVIRONMENT CONFIGURATION
 * Validation et typage des variables d'environnement
 * Aucun fallback sur les secrets critiques
 */

import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ CRITICAL: Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function optionalEnvInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : defaultValue;
}

export const env = {
  // Server
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: optionalEnvInt('PORT', 3001),
  
  // Supabase (required)
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_ANON_KEY: optionalEnv('SUPABASE_ANON_KEY', ''),

  // Security
  INTERNAL_API_KEY: optionalEnv('INTERNAL_API_KEY', ''),
  JWT_SECRET: optionalEnv('JWT_SECRET', ''),

  // OAuth (Google)
  OAUTH_CLIENT_ID: optionalEnv('OAUTH_CLIENT_ID', ''),
  OAUTH_CLIENT_SECRET: optionalEnv('OAUTH_CLIENT_SECRET', ''),
  OAUTH_REDIRECT_URI: optionalEnv('OAUTH_REDIRECT_URI', ''),

  // CORS
  CORS_ORIGINS: optionalEnv(
    'CORS_ORIGINS',
    'http://localhost:5173,http://localhost:8080,https://224solution.net,https://www.224solution.net'
  ),

  // CSP
  CSP_CONNECT_SRC: optionalEnv('CSP_CONNECT_SRC', ''),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: optionalEnvInt('RATE_LIMIT_WINDOW_MS', 60000),
  RATE_LIMIT_MAX_REQUESTS: optionalEnvInt('RATE_LIMIT_MAX_REQUESTS', 10000),

  // Uploads
  MAX_FILE_SIZE: optionalEnvInt('MAX_FILE_SIZE', 10 * 1024 * 1024),
  UPLOAD_PATH: optionalEnv('UPLOAD_PATH', './uploads'),

  // Logging
  LOG_LEVEL: optionalEnv('LOG_LEVEL', 'info'),
  LOG_FILE: optionalEnv('LOG_FILE', './logs/backend.log'),

  // Cron
  ENABLE_CRON_JOBS: optionalEnv('ENABLE_CRON_JOBS', 'true') === 'true',

  // Feature flags
  ENABLE_MONITORING: optionalEnv('ENABLE_MONITORING', 'true') === 'true',

  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  },

  get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  },

  get corsOrigins(): string[] {
    return this.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  },

  get oauthConfigured(): boolean {
    return Boolean(this.OAUTH_CLIENT_ID && this.OAUTH_CLIENT_SECRET && this.OAUTH_REDIRECT_URI);
  }
} as const;
