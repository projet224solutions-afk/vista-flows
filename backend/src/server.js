/**
 * 🚀 224SOLUTIONS - BACKEND NODE.JS SECONDAIRE
 * 
 * Architecture: Backend pour traitement lourd, cron jobs, services internes
 * Auth: Vérification JWT Supabase
 * Database: PostgreSQL via Supabase
 * Scalabilité: Horizontale (stateless)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import xss from 'xss-clean';
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
import analyticsRoutes from './routes/analytics.routes.js';
import subscriptionRoutesV3 from '../dist/routes/subscriptions.routes.js';
import paymentRoutesV3 from '../dist/routes/payments.routes.js';
import walletRoutesV2 from '../dist/routes/wallet.v2.routes.js';
import vendorRoutesV3 from '../dist/routes/vendors.routes.js';
import productRoutesV3 from '../dist/routes/products.routes.js';
import orderRoutesV3 from '../dist/routes/orders.routes.js';
import posRoutesV3 from '../dist/routes/pos.routes.js';
import inventoryRoutesV3 from '../dist/routes/inventory.routes.js';
import affiliateRoutesV3 from '../dist/routes/affiliate.routes.js';
import paymentLinksRoutesV3 from '../dist/routes/paymentLinks.routes.js';
import marketplaceVisibilityRoutesV3 from '../dist/routes/marketplaceVisibility.routes.js';
import coreRoutesV3 from '../dist/routes/core.routes.js';
import webhookRoutesV3 from '../dist/routes/webhooks.routes.js';
import migrationsRoutesV3 from '../dist/routes/migrations.js';
import edgePaymentsRoutesV3 from '../dist/routes/edge-functions/payments.routes.js';

// Configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

function originMatchesPattern(origin, pattern) {
  if (!pattern) return false;
  if (pattern === '*') return true;
  if (origin === pattern) return true;

  const wildcardIndex = pattern.indexOf('*');
  if (wildcardIndex === -1) return false;

  const prefix = pattern.slice(0, wildcardIndex);
  const suffix = pattern.slice(wildcardIndex + 1);
  return origin.startsWith(prefix) && origin.endsWith(suffix);
}

// ==================== MIDDLEWARES SÉCURITÉ ====================

// Helmet - Sécurité headers HTTP (optimisé pour React/Vite)
// CSP durci : pas de unsafe-inline, connectSrc limité
const cspConnectSrc = process.env.CSP_CONNECT_SRC
  ? process.env.CSP_CONNECT_SRC.split(',').map(s => s.trim())
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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS - Configuration stricte avec support mobile / domaines wildcard
const corsOptions = {
  origin: (origin, callback) => {
    const defaultOrigins = [
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://localhost:5173',
      'capacitor://localhost',
      'ionic://localhost',
      'https://224solution.net',
      'https://www.224solution.net',
      'https://*.224solution.net'
    ];
    const envOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
    
    // Autoriser les requêtes sans origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowedOrigin) => originMatchesPattern(origin, allowedOrigin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key', 'Idempotency-Key']
};
app.use(cors(corsOptions));

// Compression gzip pour réduire la taille des réponses
app.use(compression());

// Protection contre les attaques XSS et injections
app.use(xss());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting global
app.use(rateLimiter);

// Logging des requêtes
app.use(requestLogger);

// ==================== ROUTES ====================

// Health check (public)
app.use('/health', healthRoutes);
app.use('/healthz', healthRoutes);
app.use('/healthz.json', healthRoutes);

// Webhooks (public, signature-validated)
app.use('/webhooks', webhookRoutesV3);

// Auth routes (public)
app.use('/auth', authRoutes);

// Analytics tracking routes (public tracking + authenticated retrieval)
app.use('/api/analytics', analyticsRoutes);

// Legacy wallet routes
app.use('/api/wallet', walletRoutes);

// V2 routes from the compiled backend
app.use('/api/v2/wallet', walletRoutesV2);
app.use('/api/subscriptions', subscriptionRoutesV3);
app.use('/api/payments', paymentRoutesV3);

// V3 routes from the compiled backend
app.use('/api/vendors', vendorRoutesV3);
app.use('/api/products', productRoutesV3);
app.use('/api/orders', orderRoutesV3);
app.use('/api/pos', posRoutesV3);
app.use('/api/affiliate', affiliateRoutesV3);
app.use('/api/inventory', inventoryRoutesV3);
app.use('/api/payment-links', paymentLinksRoutesV3);
app.use('/api/marketplace-visibility', marketplaceVisibilityRoutesV3);
app.use('/api/core', coreRoutesV3);
app.use('/api/migrations', migrationsRoutesV3);
app.use('/edge-functions/payments', edgePaymentsRoutesV3);

// Internal API (protégé par clé interne)
app.use('/internal', internalRoutes);

// Jobs & Cron (protégé par JWT)
app.use('/jobs', jobsRoutes);

// Media processing (protégé par JWT)
app.use('/media', mediaRoutes);

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// ==================== SERVEUR ====================

const isVercelRuntime = Boolean(process.env.VERCEL);
let server = null;

if (isVercelRuntime) {
  logger.info('⚡ Backend running in Vercel serverless mode');
} else {
  server = app.listen(PORT, () => {
    logger.info(`🚀 Backend Node.js started on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔐 CORS Origins: ${process.env.CORS_ORIGINS || 'localhost:5173'}`);
    logger.info(`✅ Ready to handle requests`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server?.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server?.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
}

// Gestion erreurs non catchées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
