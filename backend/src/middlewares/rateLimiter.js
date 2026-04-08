/**
 * 🛡️ RATE LIMITING MIDDLEWARE
 * Protection contre les abus et DDoS
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.js';

const LOCALHOST_PATTERN = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;
const LOCAL_IPS = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);

function isLocalDevelopmentRequest(req) {
  const ip = String(req.ip || '').trim();
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const host = String(req.headers.host || '').trim();

  const isLocalIp = LOCAL_IPS.has(ip) || LOCAL_IPS.has(forwardedFor);
  return process.env.NODE_ENV !== 'production' && (isLocalIp || LOCALHOST_PATTERN.test(host));
}

/**
 * Rate limiter global
 * 10,000 requêtes par minute par IP (166 req/sec)
 * Augmenté pour supporter 2,000-3,000 utilisateurs simultanés
 */
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10000, // 10,000 req/min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Trop de requêtes. Veuillez réessayer dans une minute.',
      retryAfter: 60
    });
  },
  skip: (req) => {
    if (isLocalDevelopmentRequest(req)) {
      return true;
    }

    // Skip rate limiting pour routes techniques / navigation de base
    return req.method === 'OPTIONS'
      || req.path === '/'
      || req.path === '/health'
      || req.path === '/healthz'
      || req.path === '/healthz.json'
      || req.path.startsWith('/assets')
      || req.path.startsWith('/favicon');
  }
});

/**
 * Rate limiter strict pour endpoints sensibles
 * 10 requêtes par 15 minutes
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many attempts, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many attempts, please try again later'
    });
  }
});

/**
 * Rate limiter pour uploads
 * 20 uploads par heure
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Upload limit reached, please try again later'
  }
});
