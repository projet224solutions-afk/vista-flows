/**
 * 🔒 INTERNAL API ROUTES
 * Routes protégées par clé API interne (communication inter-backends)
 */

import express from 'express';
import { authenticateInternal } from '../middlewares/auth.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// Toutes les routes sont protégées par clé API interne
router.use(authenticateInternal);

/**
 * POST /internal/trigger-job
 * Déclenche un job depuis Edge Functions
 */
router.post('/trigger-job', async (req, res) => {
  try {
    const { jobType, payload } = req.body;
    
    logger.info(`Internal job triggered: ${jobType}`);
    
    // TODO: Implémenter le système de jobs
    
    res.json({
      success: true,
      message: 'Job triggered successfully',
      jobType,
      jobId: Date.now().toString()
    });
  } catch (error) {
    logger.error(`Internal job error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /internal/process-batch
 * Traitement batch de données
 */
router.post('/process-batch', async (req, res) => {
  try {
    const { data, operation } = req.body;
    
    logger.info(`Batch processing started: ${operation}`);
    
    // TODO: Implémenter traitement batch
    
    res.json({
      success: true,
      message: 'Batch processed',
      processed: data?.length || 0
    });
  } catch (error) {
    logger.error(`Batch processing error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
