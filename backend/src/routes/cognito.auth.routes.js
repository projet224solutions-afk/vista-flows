/**
 * 🔐 COGNITO AUTH GATEWAY ROUTES
 * Backend centralise toutes les requêtes d'authentification
 * Vérifie les tokens Cognito et synchronise avec Google Cloud SQL
 */

import express from 'express';
import { verifyCognitoToken, requireCognitoRole } from '../middlewares/cognito.middleware.js';
import { syncCognitoUser, getUserByCognitoId, updateUserProfile } from '../services/cognitoSync.service.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/cognito/sync-profile
 * Après inscription/connexion Cognito côté client,
 * synchronise le profil dans Google Cloud SQL
 */
router.post('/sync-profile', verifyCognitoToken, async (req, res) => {
  try {
    const { additionalData } = req.body;

    const result = await syncCognitoUser(req.cognitoUser, {
      ...additionalData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    logger.info(`✅ Profile synced for Cognito user: ${req.cognitoUser.sub}`);
    res.json({
      success: true,
      message: 'Profil synchronisé',
      user: result.user,
    });
  } catch (error) {
    logger.error(`❌ Profile sync error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la synchronisation du profil',
    });
  }
});

/**
 * GET /api/cognito/me
 * Récupère le profil utilisateur depuis Cloud SQL
 */
router.get('/me', verifyCognitoToken, async (req, res) => {
  try {
    const { sub, email, role } = req.cognitoUser;

    // TODO: Requête Cloud SQL
    // const { rows } = await pool.query(
    //   'SELECT * FROM users WHERE cognito_user_id = $1',
    //   [sub]
    // );

    res.json({
      success: true,
      user: {
        cognitoUserId: sub,
        email,
        role,
      },
    });
  } catch (error) {
    logger.error(`❌ Get profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil',
    });
  }
});

/**
 * PUT /api/cognito/profile
 * Met à jour le profil dans Cloud SQL
 */
router.put('/profile', verifyCognitoToken, async (req, res) => {
  try {
    const { sub } = req.cognitoUser;
    const { fullName, phone, city, country, avatarUrl } = req.body;

    // TODO: Update Cloud SQL
    // const { rows } = await pool.query(
    //   `UPDATE users SET full_name = $1, phone = $2, city = $3, country = $4, 
    //    avatar_url = $5, updated_at = NOW() WHERE cognito_user_id = $6 RETURNING *`,
    //   [fullName, phone, city, country, avatarUrl, sub]
    // );

    logger.info(`✅ Profile updated for: ${sub}`);

    res.json({
      success: true,
      message: 'Profil mis à jour',
    });
  } catch (error) {
    logger.error(`❌ Update profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil',
    });
  }
});

/**
 * DELETE /api/cognito/account
 * Supprime le compte (soft delete)
 */
router.delete('/account', verifyCognitoToken, async (req, res) => {
  try {
    const { sub } = req.cognitoUser;

    // TODO: Soft delete Cloud SQL
    // await pool.query(
    //   'UPDATE users SET is_active = false, deleted_at = NOW() WHERE cognito_user_id = $1',
    //   [sub]
    // );

    logger.info(`✅ Account deactivated for: ${sub}`);

    res.json({
      success: true,
      message: 'Compte désactivé',
    });
  } catch (error) {
    logger.error(`❌ Delete account error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la désactivation du compte',
    });
  }
});

/**
 * POST /api/cognito/validate-token
 * Endpoint pour que le frontend vérifie la validité du token
 */
router.post('/validate-token', verifyCognitoToken, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: req.cognitoUser,
  });
});

export default router;
