/**
 * 🚀 224SOLUTIONS - BACKEND NODE.JS CENTRALISÉ v3 (Phase 6)
 * 
 * Architecture: Express/TypeScript
 * Auth: JWT Supabase
 * Database: PostgreSQL via Supabase
 * Cache: Redis (optional, graceful fallback)
 * Jobs: BullMQ (optional, graceful fallback)
 * Webhooks: Stripe signature-validated
 */

import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { closeRedis } from './config/redis.js';
import { jobQueue } from './jobs/jobQueue.js';
import { metrics } from './services/metrics.service.js';

// Routes TypeScript
import healthRoutes from './routes/health.routes.js';
import subscriptionRoutes from './routes/subscriptions.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import walletRoutesV2 from './routes/wallet.v2.routes.js';
import vendorRoutes from './routes/vendors.routes.js';
import productRoutes from './routes/products.routes.js';
import orderRoutes from './routes/orders.routes.js';
import posRoutes from './routes/pos.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import affiliateRoutes from './routes/affiliate.routes.js';
import webhookRoutes from './routes/webhooks.routes.js';

// Routes legacy JS
// @ts-ignore
import authRoutes from './routes/auth.routes.js';
// @ts-ignore
import walletRoutes from './routes/wallet.routes.js';
// @ts-ignore
import analyticsRoutes from './routes/analytics.routes.js';
// @ts-ignore
import jobsRoutes from './routes/jobs.routes.js';
// @ts-ignore
import mediaRoutes from './routes/media.routes.js';
// @ts-ignore
import internalRoutes from './routes/internal.routes.js';
// @ts-ignore
import { rateLimiter } from './middlewares/rateLimiter.js';

const app = express();

// ==================== SECURITY MIDDLEWARES ====================

const cspConnectSrc = env.CSP_CONNECT_SRC
  ? env.CSP_CONNECT_SRC.split(',').map(s => s.trim())
  : [];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", ...cspConnectSrc],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

app.use(compression());

// ==================== WEBHOOK RAW BODY (before JSON parser) ====================

// Djomy webhooks also need raw body for HMAC signature verification
app.use('/webhooks/djomy', express.raw({ type: 'application/json' }));
// Stripe webhooks need raw body for signature verification
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// Standard JSON parser for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Correlation / Request ID
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  (req as any).requestId = requestId;

  // Request timing for metrics
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.increment('http.requests.total', 1, { method: req.method, status: String(res.statusCode) });
    metrics.observe('http.request.duration_ms', duration);
  });

  next();
});

app.use(rateLimiter);
app.use(requestLogger);

// ==================== ROUTES ====================

// Health (public)
app.use('/health', healthRoutes);

// Webhooks (public, signature-validated, BEFORE auth middleware)
app.use('/webhooks', webhookRoutes);

// Auth (public)
app.use('/auth', authRoutes);

// Analytics
app.use('/api/analytics', analyticsRoutes);

// ==================== LEGACY ROUTES ====================

app.use('/api/wallet', walletRoutes);
app.use('/internal', internalRoutes);
app.use('/jobs', jobsRoutes);
app.use('/media', mediaRoutes);

// ==================== V2 ROUTES ====================

app.use('/api/v2/wallet', walletRoutesV2);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);

// ==================== V3 ROUTES (with per-route rate limits) ====================

app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/inventory', inventoryRoutes);

// ==================== ERROR HANDLING ====================

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: _req.originalUrl });
});

app.use(errorHandler);

// ==================== SERVER ====================

const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 Backend v3 (Phase 6) started on port ${env.PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🔐 CORS Origins: ${env.corsOrigins.join(', ')}`);

  // Initialize job queues (non-blocking, graceful failure)
  await jobQueue.init();
  await jobQueue.scheduleRecurring();

  logger.info(`✅ Ready to handle requests`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received: shutting down gracefully`);

  server.close(async () => {
    logger.info('HTTP server closed');
    await jobQueue.shutdown();
    await closeRedis();
    await metrics.flushToDB();
    logger.info('All services shut down');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  metrics.increment('errors.unhandled_rejection');
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  metrics.increment('errors.uncaught_exception');
  process.exit(1);
});

export default app;
