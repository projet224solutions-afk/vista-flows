/**
 * 📊 REQUEST LOGGER - TypeScript version
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const userId = (req as AuthenticatedRequest).user?.id || 'anonymous';

    const logMessage = `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 400) {
      logger.warn(logMessage, { ip, userAgent, userId, duration });
    } else {
      logger.info(logMessage, { userId, duration });
    }
  });

  next();
}
