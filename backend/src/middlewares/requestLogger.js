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
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent,
      user: req.user?.id || 'anonymous'
    };

    // Log détaillé avec IP et User-Agent
    const logMessage = `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${ip} - ${userAgent}`;

    if (res.statusCode >= 400) {
      logger.warn(logMessage, logData);
    } else {
      logger.info(logMessage, logData);
    }
  });

  next();
}
