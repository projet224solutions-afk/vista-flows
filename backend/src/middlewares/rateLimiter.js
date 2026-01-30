/**
 * 🛡️ RATE LIMITING MIDDLEWARE
 * Protection contre les abus et DDoS
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.js';

/**
 * Rate limiter global
 * 10,000 requêtes par minute par IP (166 req/sec)
 * Augmenté pour supporter 2,000-3,000 utilisateurs simultanés
 */
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000, // 10,000 req/min
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
    // Skip rate limiting pour health check et static assets
    return req.path === '/health' || req.path.startsWith('/assets');
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
