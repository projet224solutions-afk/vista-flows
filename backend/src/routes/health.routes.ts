/**
 * ❤️ HEALTH CHECK - TypeScript version
 * Routes publiques pour monitoring
 */

import { Router, Request, Response } from 'express';
import { checkSupabaseConnection } from '../config/supabase.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * GET /health
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '2.0.0'
  });
});

/**
 * GET /health/detailed
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const supabaseStatus = await checkSupabaseConnection();

  res.json({
    success: true,
    status: supabaseStatus.success ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    dependencies: {
      supabase: supabaseStatus
    },
    system: {
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`
      },
      node: process.version,
      platform: process.platform,
      pid: process.pid
    }
  });
});

/**
 * GET /health/ready - Readiness probe (Kubernetes/Docker)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const supabase = await checkSupabaseConnection();
  
  if (!supabase.success) {
    res.status(503).json({ success: false, status: 'not_ready', reason: 'supabase_unavailable' });
    return;
  }

  res.json({ success: true, status: 'ready' });
});

export default router;
