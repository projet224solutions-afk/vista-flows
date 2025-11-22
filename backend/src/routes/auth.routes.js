/**
 * 🔐 AUTH ROUTES
 * Routes d'authentification (Google OAuth, etc.)
 */

import express from 'express';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * GET /auth/google
 * Initie le flow OAuth Google
 * (À implémenter selon vos besoins)
 */
router.get('/google', (req, res) => {
  logger.info('Google OAuth flow initiated');
  
  // TODO: Implémenter Google OAuth
  res.status(501).json({
    success: false,
    error: 'Google OAuth not implemented yet',
    message: 'Use Supabase Auth for OAuth flows'
  });
});

/**
 * GET /auth/google/callback
 * Callback OAuth Google
 */
router.get('/google/callback', (req, res) => {
  logger.info('Google OAuth callback received');
  
  // TODO: Implémenter callback
  res.redirect('/auth/google/success');
});

export default router;
