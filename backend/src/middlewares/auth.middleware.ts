/**
 * 🔐 AUTH MIDDLEWARE - TypeScript version
 * JWT verification via Supabase Auth
 * Consolidation des deux anciens middlewares (auth.js + auth.middleware.js)
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  profile: Record<string, any> | null;
  emailConfirmedAt?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Vérifie le JWT Supabase et charge le profil utilisateur
 */
export async function verifyJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token d\'accès requis',
        message: 'Un token Bearer est requis dans le header Authorization'
      });
      return;
    }

    // Verify with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn(`Invalid token attempt: ${error?.message || 'No user returned'}`);
      res.status(403).json({
        success: false,
        error: 'Token expiré ou invalide',
        message: error?.message || 'Le token n\'est pas valide'
      });
      return;
    }

    // Load profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'client',
      profile: profile || null,
      emailConfirmedAt: user.email_confirmed_at
    };

    logger.info(`Authenticated: ${user.id} (${user.email})`);
    next();
  } catch (error: any) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erreur d\'authentification',
      message: 'Une erreur s\'est produite lors de la vérification du token'
    });
  }
}

/**
 * JWT optionnel - ne bloque pas si absent
 */
export async function optionalJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email || '',
        role: profile?.role || 'client',
        profile: profile || null
      };
    }
  } catch {
    // Silent fail - user remains anonymous
  }

  next();
}

/**
 * Vérifie les permissions par rôle
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for ${req.user.id} - Required: ${roles.join(', ')}`);
      res.status(403).json({ success: false, error: 'Permissions insuffisantes' });
      return;
    }

    next();
  };
}

/**
 * Clé API interne (communication inter-backends)
 */
export function authenticateInternal(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-internal-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ success: false, error: 'Internal API key required' });
    return;
  }

  if (!env.INTERNAL_API_KEY || apiKey !== env.INTERNAL_API_KEY) {
    logger.warn(`Invalid internal API key from IP: ${req.ip}`);
    res.status(403).json({ success: false, error: 'Invalid API key' });
    return;
  }

  next();
}
