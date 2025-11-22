/**
 * ❤️ HEALTH CHECK ROUTES
 * Routes publiques pour monitoring
 */

import express from 'express';
import { checkSupabaseConnection } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /health
 * Health check simple
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /health/detailed
 * Health check détaillé avec dépendances
 */
router.get('/detailed', async (req, res) => {
  const supabaseStatus = await checkSupabaseConnection();

  const health = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    dependencies: {
      supabase: supabaseStatus,
      redis: { success: false, message: 'Not configured' } // À implémenter
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      node: process.version,
      platform: process.platform
    }
  };

  res.json(health);
});

export default router;
