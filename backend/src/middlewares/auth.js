/**
 * 🔐 MIDDLEWARE D'AUTHENTIFICATION
 * Vérifie les tokens JWT générés par Supabase Auth
 */

import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Vérifie le token JWT Supabase
 * Extrait l'utilisateur et l'ajoute à req.user
 */
export async function authenticateToken(req, res, next) {
  try {
    // Extraire le token du header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn(`Invalid token attempt: ${error?.message}`);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Charger le profil complet depuis la DB
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error(`Error loading profile: ${profileError.message}`);
    }

    // Ajouter l'utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'client',
      profile: profile || null
    };

    logger.info(`Authenticated user: ${user.id} (${user.email})`);
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
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
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} - Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Vérifie la clé API interne (communication entre backends)
 */
export function authenticateInternal(req, res, next) {
  const apiKey = req.headers['x-internal-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Internal API key required'
    });
  }

  if (apiKey !== process.env.INTERNAL_API_KEY) {
    logger.warn(`Invalid internal API key attempt from IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
}
