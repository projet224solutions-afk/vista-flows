import rateLimit from 'express-rate-limit';

// Rate limiter global (100 req/15min par IP)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max par fenêtre
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter authentification (5 tentatives/15min)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Ne compte que les échecs
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter API sensibles (20 req/min)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requêtes max
  message: 'API rate limit exceeded, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter paiements (10 req/min)
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 10, // 10 paiements max
  message: 'Payment rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
});
