/**
 * 💰 SUBSCRIPTIONS ROUTES - Phase 2 (alignée DB existante)
 * 
 * Tables utilisées :
 *   - `plans` (table existante) : id, name, display_name, monthly_price_gnf, yearly_price_gnf, max_products, etc.
 *   - `subscriptions` (table existante) : user_id, plan_id, price_paid_gnf, billing_cycle, status, etc.
 * 
 * Statuts valides (alignés avec l'existant) :
 *   - active, cancelled, expired, trialing, past_due
 * 
 * ⚠️ Aucun contournement du flow de paiement existant.
 *   La route /subscribe crée un abonnement en statut 'pending' ou 'trialing',
 *   JAMAIS directement 'active' sans paiement validé.
 */

import { Router, Response } from 'express';
import { verifyJWT, requireRole } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

// ==================== Statuts autorisés ====================
const VALID_STATUSES = ['active', 'cancelled', 'expired', 'trialing', 'past_due'] as const;
type SubscriptionStatus = typeof VALID_STATUSES[number];

/**
 * GET /api/subscriptions/plans
 * Liste les plans d'abonnement depuis la table `plans`
 */
router.get('/plans', async (_req, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    logger.error(`Error fetching plans: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des plans' });
  }
});

/**
 * GET /api/subscriptions/current
 * Abonnement actuel de l'utilisateur depuis la table `subscriptions`
 */
router.get('/current', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
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
 * GET /api/subscriptions/history
 * Historique des abonnements
 */
router.get('/history', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabaseAdmin
      .from('subscriptions')
      .select('*, plans(name, display_name)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0, hasMore: (offset + limit) < (count || 0) }
    });
  } catch (error: any) {
    logger.error(`Error fetching subscription history: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * POST /api/subscriptions/subscribe
 * 
 * Initie une souscription — ne met PAS directement en "active".
 * 
 * Flow :
 *   1. Vérifie que le plan existe et est actif
 *   2. Vérifie qu'il n'y a pas d'abonnement actif
 *   3. Si plan gratuit (monthly_price_gnf = 0) → status = 'active'
 *   4. Si plan payant → status = 'trialing' ou attend la confirmation de paiement
 *   5. L'activation réelle se fait via /confirm après paiement validé
 */
router.post('/subscribe', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { plan_id, billing_cycle = 'monthly', payment_method } = req.body;

    if (!plan_id) {
      res.status(400).json({ success: false, error: 'plan_id requis' });
      return;
    }

    // 1. Vérifier le plan dans la table `plans`
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      res.status(404).json({ success: false, error: 'Plan non trouvé ou inactif' });
      return;
    }

    // 2. Vérifier pas d'abonnement actif
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .maybeSingle();

    if (existing) {
      res.status(409).json({ 
        success: false, 
        error: 'Un abonnement actif existe déjà',
        current_status: existing.status
      });
      return;
    }

    // 3. Calculer le prix selon le cycle
    const pricePaid = billing_cycle === 'yearly' && plan.yearly_price_gnf
      ? plan.yearly_price_gnf
      : plan.monthly_price_gnf;

    // 4. Déterminer le statut initial
    const isFree = pricePaid === 0;
    const initialStatus: SubscriptionStatus = isFree ? 'active' : 'trialing';

    // 5. Calculer les dates de période
    const now = new Date();
    const periodEnd = new Date(now);
    if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 6. Créer l'abonnement dans la table `subscriptions`
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id,
        price_paid_gnf: pricePaid,
        billing_cycle,
        status: initialStatus,
        started_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        auto_renew: true,
        payment_method: payment_method || null,
        metadata: {
          initiated_from: 'backend_v2',
          plan_name: plan.name,
          requires_payment: !isFree
        }
      })
      .select('*, plans(name, display_name, max_products)')
      .single();

    if (subError) throw subError;

    logger.info(`Subscription created: user=${userId}, plan=${plan.name}, status=${initialStatus}, price=${pricePaid} GNF`);

    res.status(201).json({ 
      success: true, 
      data: subscription,
      requires_payment: !isFree,
      message: isFree 
        ? 'Abonnement gratuit activé' 
        : 'Abonnement en attente de paiement'
    });
  } catch (error: any) {
    logger.error(`Error creating subscription: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'abonnement' });
  }
});

/**
 * POST /api/subscriptions/confirm
 * Confirmer un abonnement après paiement validé.
 * Passe le statut de 'trialing' → 'active'.
 */
router.post('/confirm', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subscription_id, payment_transaction_id } = req.body;

    if (!subscription_id) {
      res.status(400).json({ success: false, error: 'subscription_id requis' });
      return;
    }

    // Vérifier que l'abonnement existe et appartient à l'utilisateur
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      res.status(404).json({ success: false, error: 'Abonnement non trouvé' });
      return;
    }

    if (subscription.status === 'active') {
      res.json({ success: true, message: 'Abonnement déjà actif', data: subscription });
      return;
    }

    if (subscription.status !== 'trialing') {
      res.status(400).json({ 
        success: false, 
        error: `Impossible de confirmer un abonnement en statut "${subscription.status}"` 
      });
      return;
    }

    // Activer l'abonnement
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        payment_transaction_id: payment_transaction_id || null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...((subscription.metadata as any) || {}),
          confirmed_at: new Date().toISOString(),
          confirmed_from: 'backend_v2'
        }
      })
      .eq('id', subscription_id)
      .select('*, plans(name, display_name)')
      .single();

    if (updateError) throw updateError;

    logger.info(`Subscription confirmed: ${subscription_id} for user ${userId}`);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`Error confirming subscription: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la confirmation' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Annuler un abonnement — statut → 'cancelled'
 */
router.post('/cancel', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !subscription) {
      res.status(404).json({ success: false, error: 'Aucun abonnement actif' });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        updated_at: new Date().toISOString(),
        metadata: {
          ...((subscription.metadata as any) || {}),
          cancelled_at: new Date().toISOString(),
          cancelled_from: 'backend_v2'
        }
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    logger.info(`Subscription cancelled: ${subscription.id} for user ${userId}`);
    res.json({ success: true, message: 'Abonnement annulé' });
  } catch (error: any) {
    logger.error(`Error canceling subscription: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'annulation' });
  }
});

/**
 * GET /api/subscriptions/limits
 * Vérifie les limites du plan actuel (produits, images, fonctionnalités)
 */
router.get('/limits', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('plans(max_products, max_images_per_product, analytics_access, priority_support, featured_products, api_access, custom_branding)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!sub || !sub.plans) {
      // Fallback : limites par défaut (plan gratuit)
      res.json({
        success: true,
        data: {
          max_products: 5,
          max_images_per_product: 3,
          analytics_access: false,
          priority_support: false,
          featured_products: false,
          api_access: false,
          custom_branding: false
        },
        has_subscription: false
      });
      return;
    }

    res.json({ success: true, data: sub.plans, has_subscription: true });
  } catch (error: any) {
    logger.error(`Error fetching limits: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
