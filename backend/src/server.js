/**
 * 🚀 224SOLUTIONS - BACKEND NODE.JS SECONDAIRE
 *
 * Rôle :
 * - traitement lourd
 * - cron jobs
 * - services internes
 * - API secondaire stateless
 *
 * Auth :
 * - vérification JWT Supabase dans les middlewares/routes protégées
 *
 * Database :
 * - PostgreSQL via Supabase
 *
 * Scalabilité :
 * - horizontale (stateless)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import mediaRoutes from './routes/media.routes.js';
import internalRoutes from './routes/internal.routes.js';
import healthRoutes from './routes/health.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import walletV2Routes from './routes/walletV2.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const isVercelRuntime = Boolean(process.env.VERCEL);

/**
 * Trust proxy:
 * nécessaire si l'app tourne derrière Nginx / Load Balancer / Vercel / Render / Railway / ECS / etc.
 * permet à Express de mieux lire IP / protocole réel
 */
app.set('trust proxy', 1);

/**
 * Helper CORS
 */
function getAllowedOrigins() {
  const envOrigins = process.env.CORS_ORIGINS;

  if (!envOrigins) {
    return [
      'http://localhost:5173',
      'https://localhost:5173',
    ];
  }

  return envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();

/**
 * ==================== MIDDLEWARES SÉCURITÉ ====================
 */

/**
 * Helmet
 * Pour une API backend JSON, on garde une politique simple et cohérente.
 * On évite une CSP trop complexe ou trompeuse si ce serveur ne rend pas de pages HTML riches.
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: IS_PROD
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    contentSecurityPolicy: false,
  })
);

/**
 * CORS
 * - whitelist explicite
 * - autorise absence d'origin pour mobile apps, curl, Postman, jobs serveur-serveur
 */
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`Blocked CORS request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Internal-API-Key',
      'X-Requested-With',
    ],
    optionsSuccessStatus: 204,
  })
);

/**
 * Compression
 * Réduit le poids des réponses
 */
app.use(
  compression({
    threshold: 1024,
  })
);

/**
 * Parsing JSON / form
 * Limite raisonnable pour éviter les abus sur payload
 */
app.use(
  express.json({
    limit: '2mb',
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '2mb',
  })
);

/**
 * Logging requêtes
 */
app.use(requestLogger);

/**
 * Rate limiting global
 * suppose que le middleware gère déjà la logique IP / trusted proxy
 */
app.use(rateLimiter);

/**
 * ==================== ROUTES ====================
 */

/**
 * Health check public
 */
app.use('/health', healthRoutes);
app.use('/healthz', healthRoutes);
app.use('/healthz.json', healthRoutes);

/**
 * Routes publiques
 */
app.use('/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

/**
 * Routes applicatives
 * IMPORTANT :
 * les middlewares JWT / internal API key doivent être appliqués
 * dans les route files concernés ou via middleware dédié avant montage.
 */
app.use('/api/wallet', walletRoutes);
app.use('/api/v2/wallet', walletV2Routes);
app.use('/internal', internalRoutes);
app.use('/jobs', jobsRoutes);
app.use('/media', mediaRoutes);

/**
 * ==================== 404 ====================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

/**
 * ==================== ERROR HANDLER GLOBAL ====================
 */
app.use(errorHandler);

/**
 * ==================== SERVEUR ====================
 */
let server = null;

function logReady() {
  logger.info(`📍 Environment: ${NODE_ENV}`);
  logger.info(`🔐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  logger.info('✅ Ready to handle requests');
}

if (isVercelRuntime) {
  logger.info('⚡ Backend Node.js running in Vercel serverless mode');
  logReady();
} else {
  server = app.listen(PORT, () => {
    logger.info(`🚀 Backend Node.js started on port ${PORT}`);
    logReady();
  });

  /**
   * Timeouts serveur
   * utiles pour éviter les connexions qui restent bloquées trop longtemps
   */
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

/**
 * ==================== GRACEFUL SHUTDOWN ====================
 */
let isShuttingDown = false;

function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} signal received: closing HTTP server`);

  if (!server) {
    process.exit(exitCode);
    return;
  }

  server.close((err) => {
    if (err) {
      logger.error('Error while closing HTTP server:', err);
      process.exit(1);
      return;
    }

    logger.info('HTTP server closed');
    process.exit(exitCode);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * ==================== ERREURS PROCESS ====================
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('uncaughtException', 1);
});

export default app;
