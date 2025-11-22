/**
 * 🛡️ RATE LIMITING MIDDLEWARE
 * Protection contre les abus et DDoS
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.js';

/**
 * Rate limiter global
 * 100 requêtes par 15 minutes par IP
 */
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
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
      error: 'Too many requests, please try again later'
    });
  },
  skip: (req) => {
    // Skip rate limiting pour health check
    return req.path === '/health';
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
