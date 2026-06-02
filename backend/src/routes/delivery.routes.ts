/**
 * 🚚 DELIVERY ROUTES - Backend Node.js centralisé
 *
 * Données critiques de livraison déplacées côté backend (gains, paiement wallet).
 * Le frontend ne calcule plus les gains ni ne déclenche de mouvement wallet directement.
 *
 * Tables utilisées : `deliveries`, `drivers`, `wallets` (via wallet.service)
 *
 * Endpoints (montés sur /api/v2/delivery) :
 *   - GET  /stats     — statistiques de gains (jour/semaine/mois/total) du livreur connecté
 *   - POST /complete  — finalise une livraison : écrit driver_earning + incrémente les totaux driver
 *   - POST /payment   — encaisse : crédite le wallet du livreur (idempotent) et marque la livraison payée
 *
 * ⚠️ deliveries.driver_id référence profiles.id = user.id (auth uid).
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { creditWallet } from '../services/wallet.service.js';
import { emitCoreFeatureEvent } from '../services/coreFeatureEvents.service.js';

const router = Router();

// Commission plateforme : le livreur perçoit 98,5 % des frais de livraison.
const DRIVER_EARNING_RATE = 0.985;

// Méthodes de paiement déclenchant un crédit wallet (le cash est encaissé en main propre).
const ELECTRONIC_METHODS = new Set(['wallet', 'mobile_money', 'prepaid', 'card', 'bank']);

// Encaissement en espèces : le livreur reçoit le cash directement, pas de crédit wallet.
const CASH_METHODS = new Set(['cash', 'cod', 'especes', 'espèces']);

/** Le gain est-il crédité sur le wallet ? Oui sauf paiement en espèces. */
function shouldCreditWallet(method: string | null | undefined): boolean {
  return !CASH_METHODS.has(String(method || '').toLowerCase());
}

/** Gain livreur pour une livraison (driver_earning si présent, sinon 98,5 % des frais). */
function resolveDriverEarning(delivery: { driver_earning?: number | null; delivery_fee?: number | null }): number {
  const stored = Number(delivery.driver_earning);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const fee = Number(delivery.delivery_fee) || 0;
  return Math.round(fee * DRIVER_EARNING_RATE);
}

/**
 * GET /api/v2/delivery/stats
 * Gains et nombre de livraisons du livreur connecté (jour / semaine / mois / total).
 * Corrige le bug historique : filtre sur driver_id = user.id (et non drivers.id).
 */
router.get('/stats', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('deliveries')
      .select('driver_earning, delivery_fee, completed_at')
      .eq('driver_id', userId)
      .eq('status', 'delivered');

    if (error) throw error;

    const rows = data || [];
    const sumSince = (since: string) => {
      const filtered = rows.filter((d: any) => d.completed_at && d.completed_at >= since);
      return {
        earnings: filtered.reduce((s: number, d: any) => s + resolveDriverEarning(d), 0),
        count: filtered.length,
      };
    };

    const today = sumSince(startOfDay);
    const week = sumSince(weekStart);
    const month = sumSince(monthStart);
    const totalEarnings = rows.reduce((s: number, d: any) => s + resolveDriverEarning(d), 0);

    res.json({
      success: true,
      data: {
        todayEarnings: today.earnings,
        todayDeliveries: today.count,
        weekEarnings: week.earnings,
        weekDeliveries: week.count,
        monthEarnings: month.earnings,
        monthDeliveries: month.count,
        totalEarnings,
        totalDeliveries: rows.length,
      },
    });
  } catch (error: any) {
    logger.error(`[Delivery] stats error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement des statistiques' });
  }
});

/**
 * POST /api/v2/delivery/complete
 * Finalise une livraison : écrit driver_earning (98,5 %) + incrémente les totaux du driver.
 * N'effectue AUCUN mouvement wallet (l'encaissement passe par /payment).
 *
 * Body : { delivery_id, proof_photo_url?, signature? }
 */
router.post('/complete', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { delivery_id, proof_photo_url, signature } = req.body || {};

    if (!delivery_id || typeof delivery_id !== 'string') {
      res.status(400).json({ success: false, error: 'delivery_id requis' });
      return;
    }

    const { data: delivery, error: fetchError } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, driver_id, delivery_fee, driver_earning, payment_method, driver_payment_method')
      .eq('id', delivery_id)
      .eq('driver_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!delivery) {
      res.status(404).json({ success: false, error: 'Livraison introuvable ou non assignée à ce livreur' });
      return;
    }

    const earning = resolveDriverEarning(delivery);

    // Idempotent : déjà livrée → on renvoie le gain sans réécrire
    if (delivery.status === 'delivered') {
      res.json({ success: true, already_completed: true, driver_earning: delivery.driver_earning ?? earning });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update({
        status: 'delivered',
        completed_at: new Date().toISOString(),
        driver_earning: earning,
        proof_photo_url: proof_photo_url || null,
        client_signature: signature || null,
      })
      .eq('id', delivery_id)
      .eq('driver_id', userId);

    if (updateError) throw updateError;

    // Incrémenter les totaux du driver (best-effort, ne bloque pas la livraison)
    try {
      const { data: driverRow } = await supabaseAdmin
        .from('drivers')
        .select('id, earnings_total, total_deliveries')
        .eq('user_id', userId)
        .maybeSingle();

      if (driverRow) {
        await supabaseAdmin
          .from('drivers')
          .update({
            earnings_total: (Number(driverRow.earnings_total) || 0) + earning,
            total_deliveries: (Number(driverRow.total_deliveries) || 0) + 1,
            status: 'online',
          })
          .eq('id', driverRow.id);
      }
    } catch (statErr: any) {
      logger.warn(`[Delivery] driver totals update failed: ${statErr.message}`);
    }

    // Crédit wallet automatique du gain livreur (sauf encaissement en espèces).
    // Idempotence partagée avec /payment → aucun double crédit possible.
    const method = String(delivery.payment_method || 'prepaid').toLowerCase();
    let credited = false;
    if (shouldCreditWallet(method)) {
      const creditResult = await creditWallet(
        userId,
        earning,
        `Gain livraison #${String(delivery_id).slice(0, 8)}`,
        `delivery_${delivery_id}`,
        'delivery_earning',
        `delivery-earning:${delivery_id}`,
      );
      credited = creditResult.success;
      if (!creditResult.success) {
        logger.warn(`[Delivery] wallet credit failed for delivery=${delivery_id}: ${creditResult.error}`);
      }
    }

    // Marquer l'encaissement réglé (évite la réapparition d'une étape de paiement manuelle)
    await supabaseAdmin
      .from('deliveries')
      .update({ driver_payment_method: method })
      .eq('id', delivery_id)
      .eq('driver_id', userId);

    logger.info(`[Delivery] Completed: delivery=${delivery_id}, driver=${userId}, earning=${earning}, credited=${credited}`);
    await emitCoreFeatureEvent({
      featureKey: 'delivery.complete',
      coreEngine: 'commerce',
      ownerModule: 'delivery',
      criticality: 'high',
      status: 'success',
      userId,
      payload: { delivery_id, driver_earning: earning, credited },
    });

    res.json({ success: true, driver_earning: earning, credited });
  } catch (error: any) {
    logger.error(`[Delivery] complete error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'delivery.complete',
      coreEngine: 'commerce',
      ownerModule: 'delivery',
      criticality: 'high',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
    res.status(500).json({ success: false, error: 'Erreur lors de la finalisation de la livraison' });
  }
});

/**
 * POST /api/v2/delivery/payment
 * Encaisse une livraison terminée.
 *  - Méthodes électroniques (wallet, mobile money, prépayé…) → crédite le wallet du livreur (idempotent).
 *  - Espèces (cash) → aucun mouvement wallet (encaissé en main propre), simple marquage.
 * Marque la livraison payée via driver_payment_method.
 *
 * Body : { delivery_id, payment_method }
 */
router.post('/payment', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { delivery_id, payment_method } = req.body || {};

    if (!delivery_id || typeof delivery_id !== 'string') {
      res.status(400).json({ success: false, error: 'delivery_id requis' });
      return;
    }
    const method = String(payment_method || 'cash').toLowerCase();

    const { data: delivery, error: fetchError } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, driver_id, delivery_fee, driver_earning, driver_payment_method')
      .eq('id', delivery_id)
      .eq('driver_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!delivery) {
      res.status(404).json({ success: false, error: 'Livraison introuvable ou non assignée à ce livreur' });
      return;
    }
    if (delivery.status !== 'delivered') {
      res.status(400).json({ success: false, error: 'La livraison doit être terminée avant l\'encaissement' });
      return;
    }

    const earning = resolveDriverEarning(delivery);

    // Idempotent : déjà encaissée
    if (delivery.driver_payment_method) {
      res.json({ success: true, already_paid: true, amount: earning, credited: false });
      return;
    }

    const isElectronic = ELECTRONIC_METHODS.has(method);
    let credited = false;

    if (isElectronic) {
      const idemKey = `delivery-earning:${delivery_id}`;
      const result = await creditWallet(
        userId,
        earning,
        `Gain livraison #${String(delivery_id).slice(0, 8)}`,
        `delivery_${delivery_id}`,
        'delivery_earning',
        idemKey,
      );

      if (!result.success) {
        await emitCoreFeatureEvent({
          featureKey: 'delivery.payment',
          coreEngine: 'payment',
          ownerModule: 'delivery',
          criticality: 'critical',
          status: 'failure',
          userId,
          payload: { delivery_id, amount: earning, method, error: result.error || 'credit_failed' },
        });
        res.status(400).json({ success: false, error: result.error || 'Échec du crédit wallet' });
        return;
      }
      credited = true;
    }

    // Marquer la livraison comme payée (driver_payment_method = marqueur d'encaissement)
    const { error: markError } = await supabaseAdmin
      .from('deliveries')
      .update({ driver_payment_method: method, payment_method: method })
      .eq('id', delivery_id)
      .eq('driver_id', userId);

    if (markError) throw markError;

    logger.info(`[Delivery] Payment: delivery=${delivery_id}, driver=${userId}, amount=${earning}, method=${method}, credited=${credited}`);
    await emitCoreFeatureEvent({
      featureKey: 'delivery.payment',
      coreEngine: 'payment',
      ownerModule: 'delivery',
      criticality: 'critical',
      status: 'success',
      userId,
      payload: { delivery_id, amount: earning, method, credited },
    });

    res.json({ success: true, amount: earning, credited, method });
  } catch (error: any) {
    logger.error(`[Delivery] payment error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'delivery.payment',
      coreEngine: 'payment',
      ownerModule: 'delivery',
      criticality: 'critical',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
    res.status(500).json({ success: false, error: 'Erreur lors de l\'encaissement' });
  }
});

export default router;
