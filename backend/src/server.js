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
 * ==================== MIGRATION ENDPOINT ====================
 * POST /api/migrations/apply-warehouse
 * Header requis: X-DB-Password (depuis Supabase > Settings > Database)
 */
app.post('/api/migrations/apply-warehouse', async (req, res) => {
  const dbPassword = req.headers['x-db-password'];
  if (!dbPassword) {
    return res.status(400).json({ success: false, message: 'Header X-DB-Password requis' });
  }
  try {
    const { Client } = await import('pg');
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const connectionString = `postgresql://postgres.uakkxaibujzxdiqzpnpr:${encodeURIComponent(dbPassword)}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`;
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const check = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendor_locations') as exists");
    if (check.rows[0]?.exists) {
      await client.end();
      return res.json({ success: true, message: 'vendor_locations existe déjà' });
    }
    const sqlFiles = [
      '../../supabase/migrations/20260129220000_multi_warehouse_pos_system.sql',
      '../../supabase/migrations/20260413160000_fix_create_order_core_columns.sql',
      '../../supabase/migrations/20260417094500_fix_create_order_core_payment_status_enum.sql',
      '../../supabase/migrations/20260427143000_allow_vendor_agents_pos_settings.sql',
      '../../supabase/migrations/20260429120000_fix_agent_subagent_commissions.sql',
      '../../supabase/migrations/20260501100000_fix_agent_commission_credits_wallets.sql',
      '../../supabase/migrations/20260502000000_fix_agent_permission_rpcs.sql',
      '../../supabase/migrations/20260502100000_cancel_order_wallet_refund.sql',
      '../../supabase/migrations/20260502200000_fix_create_order_core_payer_id_wallet_debit.sql',
      '../../supabase/migrations/20260502300000_fix_warehouse_rpcs.sql',
      '../../supabase/migrations/20260502400000_warehouse_migration_and_rls.sql',
    ];
    const results = [];
    for (const relPath of sqlFiles) {
      try {
        const fullPath = join(process.cwd(), relPath);
        const sql = readFileSync(fullPath, 'utf-8');
        await client.query(sql);
        results.push('✓ ' + relPath.split('/').pop());
      } catch (err) {
        results.push('⚠ ' + relPath.split('/').pop() + ': ' + (err.message || '').split('\n')[0]);
      }
    }
    await client.end();
    return res.json({ success: true, message: 'Migrations appliquées', results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/migrations/status', async (req, res) => {
  try {
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const missing = [];
    for (const tbl of ['vendor_locations', 'location_permissions', 'location_stock_history']) {
      const { error } = await supabase.from(tbl).select('id').limit(1);
      if (error && error.code === 'PGRST205') missing.push(tbl);
    }
    return res.json({ success: true, missing_tables: missing, migrations_needed: missing.length > 0 });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

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
