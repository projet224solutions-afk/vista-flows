/**
 * 💰 SUBSCRIPTIONS ROUTES - Phase 2 (scaffold)
 * Gestion des abonnements vendeurs
 */

import { Router, Response } from 'express';
import { verifyJWT, requireRole, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * GET /api/subscriptions/plans
 * Liste les plans d'abonnement disponibles
 */
router.get('/plans', async (_req, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    logger.error(`Error fetching plans: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des plans' });
  }
});

/**
 * GET /api/subscriptions/current
 * Abonnement actuel de l'utilisateur
 */
router.get('/current', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    res.json({ success: true, data: data || null });
  } catch (error: any) {
    logger.error(`Error fetching subscription: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération de l\'abonnement' });
  }
});

/**
 * POST /api/subscriptions/subscribe
 * Créer un abonnement
 */
router.post('/subscribe', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { plan_id, payment_method } = req.body;

    if (!plan_id) {
      res.status(400).json({ success: false, error: 'plan_id requis' });
      return;
    }

    // Vérifier le plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      res.status(404).json({ success: false, error: 'Plan non trouvé ou inactif' });
      return;
    }

    // Vérifier pas d'abonnement actif
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .limit(1)
      .maybeSingle();

    if (existing) {
      res.status(409).json({ success: false, error: 'Un abonnement actif existe déjà' });
      return;
    }

    // Créer l'abonnement
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: endDate.toISOString(),
        payment_method: payment_method || 'stripe'
      })
      .select()
      .single();

    if (subError) throw subError;

    logger.info(`Subscription created for user ${userId}, plan ${plan_id}`);
    res.status(201).json({ success: true, data: subscription });
  } catch (error: any) {
    logger.error(`Error creating subscription: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'abonnement' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Annuler un abonnement
 */
router.post('/cancel', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !subscription) {
      res.status(404).json({ success: false, error: 'Aucun abonnement actif' });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    logger.info(`Subscription canceled for user ${userId}`);
    res.json({ success: true, message: 'Abonnement annulé' });
  } catch (error: any) {
    logger.error(`Error canceling subscription: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'annulation' });
  }
});

export default router;
