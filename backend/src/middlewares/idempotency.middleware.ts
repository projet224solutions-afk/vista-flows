/**
 * 🔐 IDEMPOTENCY MIDDLEWARE - Phase 4
 * 
 * Prévient les doubles débits et créations dupliquées.
 * Le client envoie un header `Idempotency-Key` (UUID v4).
 * 
 * Fonctionnement :
 *   1. Si la clé existe déjà dans la table `idempotency_keys`, retourner la réponse cachée
 *   2. Sinon, laisser passer la requête et stocker la réponse
 *   3. Les clés expirent après 24h (nettoyage via cron ou TTL)
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export async function idempotencyGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    res.status(400).json({
      success: false,
      error: 'Header Idempotency-Key requis pour cette opération',
    });
    return;
  }

  // Valider format UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    res.status(400).json({
      success: false,
      error: 'Idempotency-Key doit être un UUID v4 valide',
    });
    return;
  }

  try {
    // Vérifier si la clé existe déjà
    const { data: existing } = await supabaseAdmin
      .from('idempotency_keys')
      .select('response_body, response_status')
      .eq('key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      logger.info(`Idempotent replay: key=${idempotencyKey}`);
      res.status(existing.response_status || 200).json(existing.response_body);
      return;
    }

    // Intercepter la réponse pour la stocker
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Stocker de manière async (ne pas bloquer la réponse)
      supabaseAdmin
        .from('idempotency_keys')
        .insert({
          key: idempotencyKey,
          response_body: body,
          response_status: res.statusCode,
          method: req.method,
          path: req.originalUrl,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .then(({ error }) => {
          if (error) {
            logger.warn(`Failed to store idempotency key: ${error.message}`);
          }
        });

      return originalJson(body);
    };

    next();
  } catch (error: any) {
    logger.error(`Idempotency middleware error: ${error.message}`);
    // En cas d'erreur du middleware, laisser passer (fail-open pour ne pas bloquer)
    next();
  }
}
