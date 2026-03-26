/**
 * 🚀 224SOLUTIONS - BACKEND NODE.JS CENTRALISÉ v2
 * 
 * Architecture: Express/TypeScript avec migration progressive
 * Auth: JWT Supabase
 * Database: PostgreSQL via Supabase  
 * 
 * Ce fichier coexiste avec server.js (legacy).
 * En production, pointer vers server.ts compilé.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';

// Routes TypeScript
import healthRoutes from './routes/health.routes.js';

// Routes legacy JS (importation progressive)
// @ts-ignore - legacy JS modules
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

// CORS
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);
app.use(requestLogger);

// ==================== ROUTES ====================

// Health (public)
app.use('/health', healthRoutes);

// Auth (public)
app.use('/auth', authRoutes);

// Analytics (public tracking + auth retrieval)
app.use('/api/analytics', analyticsRoutes);

// Wallet (JWT protected)
app.use('/api/wallet', walletRoutes);

// Internal (API key protected)
app.use('/internal', internalRoutes);

// Jobs (JWT protected)
app.use('/jobs', jobsRoutes);

// Media (JWT protected)
app.use('/media', mediaRoutes);

// ==================== PHASE 2 ROUTES ====================
// Subscriptions & Payments (TypeScript)
import subscriptionRoutes from './routes/subscriptions.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import walletRoutesV2 from './routes/wallet.routes.js';

// Use TS wallet routes (replaces legacy wallet)
app.use('/api/v2/wallet', walletRoutesV2);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);

// ==================== PHASE 3 ROUTES (à ajouter) ====================
// app.use('/api/vendors', vendorRoutes);
// app.use('/api/products', productRoutes);

// ==================== PHASE 4 ROUTES (à ajouter) ====================
// app.use('/api/orders', orderRoutes);
// app.use('/api/pos', posRoutes);

// ==================== ERROR HANDLING ====================

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: _req.originalUrl });
});

app.use(errorHandler);

// ==================== SERVER ====================

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Backend v2 started on port ${env.PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🔐 CORS Origins: ${env.corsOrigins.join(', ')}`);
  logger.info(`✅ Ready to handle requests`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received: closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force close after 10s
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
