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

// Configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== MIDDLEWARES SÉCURITÉ ====================

// Helmet - Sécurité headers HTTP (optimisé pour React/Vite)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "*"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS - Configuration stricte
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'https://localhost:5173'
    ];
    
    // Autoriser les requêtes sans origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key']
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

// Auth routes (public)
app.use('/auth', authRoutes);

// Wallet routes (protégé par JWT)
app.use('/api/wallet', walletRoutes);

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

const server = app.listen(PORT, () => {
  logger.info(`🚀 Backend Node.js started on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔐 CORS Origins: ${process.env.CORS_ORIGINS || 'localhost:5173'}`);
  logger.info(`✅ Ready to handle requests`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Gestion erreurs non catchées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
