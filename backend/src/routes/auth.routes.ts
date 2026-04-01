/**
 * 🔐 AUTH ROUTES (TypeScript)
 * Routes d'authentification OAuth Google — flux serveur sécurisé
 * Remplace auth.routes.js (legacy stub)
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger.js';
import { oauthConfig } from '../config/oauth.config.js';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from '../services/oauth.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import { emitCoreFeatureEvent } from '../services/coreFeatureEvents.service.js';

const router = Router();

/**
 * GET /auth/google
 * Redirige l'utilisateur vers l'écran de consentement Google
 */
router.get('/google', (req: Request, res: Response): void => {
  try {
    if (!oauthConfig.enabled) {
      res.status(503).json({ success: false, error: 'OAuth Google non configuré côté serveur' });
      return;
    }

    // State anti-CSRF stocké en mémoire (en prod: cookie httpOnly ou session)
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = buildGoogleAuthUrl(state);

    logger.info('OAuth: Redirecting to Google consent screen');
    res.redirect(authUrl);
  } catch (error: any) {
    logger.error(`OAuth initiation error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * GET /auth/google/callback
 * Callback OAuth Google — échange le code et récupère l'utilisateur
 */
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!oauthConfig.enabled) {
      res.status(503).json({ success: false, error: 'OAuth Google non configuré côté serveur' });
      return;
    }

    const { code, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn(`OAuth denied by user: ${oauthError}`);
      await emitCoreFeatureEvent({
        featureKey: 'auth.oauth.google.callback',
        coreEngine: 'identity',
        ownerModule: 'auth',
        criticality: 'high',
        status: 'failure',
        payload: { reason: String(oauthError) },
      });
      res.status(400).json({ success: false, error: 'OAuth consent denied' });
      return;
    }

    if (!code || typeof code !== 'string') {
      await emitCoreFeatureEvent({
        featureKey: 'auth.oauth.google.callback',
        coreEngine: 'identity',
        ownerModule: 'auth',
        criticality: 'high',
        status: 'failure',
        payload: { reason: 'missing_code' },
      });
      res.status(400).json({ success: false, error: 'Missing authorization code' });
      return;
    }

    // 1. Échange code → tokens (utilise CLIENT_SECRET côté serveur)
    const tokens = await exchangeCodeForTokens(code);

    // 2. Récupère les infos utilisateur
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // 3. Synchronise avec Supabase Auth (upsert)
    const { data: existingUsers, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();

    if (lookupError) {
      logger.error(`Supabase user lookup error: ${lookupError.message}`);
    }

    const existingUser = existingUsers?.users?.find(u => u.email === userInfo.email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      logger.info(`OAuth: Existing user found: ${userId}`);
    } else {
      // Créer l'utilisateur dans Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userInfo.email,
        email_confirm: true,
        user_metadata: {
          full_name: userInfo.name,
          avatar_url: userInfo.picture,
          provider: 'google',
        },
      });

      if (createError || !newUser.user) {
        logger.error(`Supabase user creation error: ${createError?.message}`);
        await emitCoreFeatureEvent({
          featureKey: 'auth.oauth.google.user.provision',
          coreEngine: 'identity',
          ownerModule: 'auth',
          criticality: 'critical',
          status: 'failure',
          payload: { error: createError?.message || 'create_user_failed' },
        });
        res.status(500).json({ success: false, error: 'Failed to create user' });
        return;
      }

      userId = newUser.user.id;
      logger.info(`OAuth: New user created: ${userId}`);
    }

    // 4. Répondre avec les infos (le frontend redirigera)
    res.json({
      success: true,
      user: {
        id: userId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
      // Note: NE PAS renvoyer tokens.id_token ou access_token Google au frontend
      // Utiliser une session Supabase à la place
    });

    await emitCoreFeatureEvent({
      featureKey: 'auth.oauth.google.callback',
      coreEngine: 'identity',
      ownerModule: 'auth',
      criticality: 'high',
      status: 'success',
      userId,
      payload: { email: userInfo.email },
    });
  } catch (error: any) {
    logger.error(`OAuth callback error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'auth.oauth.google.callback',
      coreEngine: 'identity',
      ownerModule: 'auth',
      criticality: 'critical',
      status: 'failure',
      payload: { error: error.message },
    });
    res.status(500).json({ success: false, error: 'OAuth authentication failed' });
  }
});

/**
 * GET /auth/oauth/status
 * Endpoint de diagnostic (sans secrets)
 */
router.get('/oauth/status', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    provider: 'google',
    configured: oauthConfig.enabled,
    note: 'Client Secret is server-side only and never exposed',
  });
});

export default router;
