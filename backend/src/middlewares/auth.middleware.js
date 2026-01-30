/**
 * 🔐 MIDDLEWARE D'AUTHENTIFICATION JWT
 * Vérifie les tokens JWT générés par Supabase Auth
 */

import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../config/logger.js';

// Initialiser Supabase client pour vérification user
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Vérifie le token JWT Supabase
 * Extrait l'utilisateur et l'ajoute à req.user
 */
export async function verifyJWT(req, res, next) {
  try {
    // Extraire le token du header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès requis',
        message: 'Un token Bearer est requis'
      });
    }

    // Vérifier le token avec Supabase (vérifie signature + expiration)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn(`Invalid token attempt: ${error?.message || 'Unknown error'}`);
      return res.status(403).json({
        success: false,
        error: 'Token expiré ou invalide',
        message: error?.message || 'Le token n\'est pas valide'
      });
    }

    // Ajouter les infos utilisateur à la requête
    req.user = {
      id: user.id,
      sub: user.id,  // Pour compatibilité
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      user_metadata: user.user_metadata,
      aud: user.aud || 'authenticated',
      role: user.role || user.user_metadata?.role
    };

    logger.info(`Authenticated user: ${user.id} (${user.email})`);
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Erreur d\'authentification',
      message: 'Une erreur s\'est produite lors de la vérification du token'
    });
  }
}

/**
 * Vérifie les permissions par rôle
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} - Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes'
      });
    }

    next();
  };
}
