/**
 * 📊 REQUEST LOGGER MIDDLEWARE
 * Log toutes les requêtes HTTP
 */

import { logger } from '../config/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log après la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      user: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
