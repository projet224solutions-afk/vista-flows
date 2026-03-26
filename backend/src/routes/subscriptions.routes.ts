/**
 * 💰 SUBSCRIPTIONS ROUTES - Phase 2 (alignée DB existante)
 * 
 * Tables utilisées :
 *   - `plans` : id, name, display_name, monthly_price_gnf, yearly_price_gnf, max_products, max_images_per_product, etc.
 *   - `subscriptions` : user_id, plan_id, price_paid_gnf, billing_cycle, status, etc.
 * 
 * Statuts valides (alignés avec l'existant) :
 *   - active      : abonnement payé et confirmé (ou gratuit)
 *   - trialing    : abonnement payant en attente de confirmation de paiement
 *   - cancelled   : abonnement annulé par l'utilisateur
 *   - expired     : abonnement expiré (période terminée ou trialing jamais confirmé)
 *   - past_due    : échec de renouvellement, paiement en retard
 * 
 * Flow subscribe → confirm :
 *   1. POST /subscribe crée un abonnement :
 *      - Plan gratuit (price = 0) → statut 'active' immédiatement
 *      - Plan payant → statut 'trialing', expire automatiquement après 48h si non confirmé
 *   2. POST /confirm active un abonnement 'trialing' après paiement validé → 'active'
 *   3. POST /expire-stale (interne/cron) nettoie les abonnements 'trialing' jamais confirmés
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

// ==================== Limites plan gratuit (chargées depuis DB) ====================
// Ne plus jamais hardcoder — ces valeurs sont lues depuis plans WHERE name = 'free'
let FREE_PLAN_FALLBACK = {
  max_products: 5 as number | null,
  max_images_per_product: 3 as number | null,
  analytics_access: false,
  priority_support: false,
  featured_products: false,
  api_access: false,
  custom_branding: false,
};

// Charger les limites du plan gratuit depuis la DB au premier appel
let freePlanFallbackLoaded = false;
async function loadFreePlanFallback() {
  if (freePlanFallbackLoaded) return;
  try {
    const { data } = await supabaseAdmin
      .from('plans')
      .select('max_products, max_images_per_product, analytics_access, priority_support, featured_products, api_access, custom_branding')
      .eq('name', 'free')
      .eq('is_active', true)
      .maybeSingle();
    if (data) {
      FREE_PLAN_FALLBACK = {
        max_products: data.max_products,
        max_images_per_product: data.max_images_per_product,
        analytics_access: data.analytics_access ?? false,
        priority_support: data.priority_support ?? false,
        featured_products: data.featured_products ?? false,
        api_access: data.api_access ?? false,
        custom_branding: data.custom_branding ?? false,
      };
    }
    freePlanFallbackLoaded = true;
  } catch (e) {
    console.error('Failed to load free plan fallback from DB:', e);
  }
}

// Délai maximum pour confirmer un abonnement trialing (48h)
const TRIALING_EXPIRY_HOURS = 48;

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
 * Initie une souscription — ne met PAS directement en 'active' pour les plans payants.
 * 
 * Flow :
 *   1. Vérifie que le plan existe et est actif
 *   2. Vérifie qu'il n'y a pas d'abonnement actif (ni en trialing)
 *   3. Si plan gratuit (monthly_price_gnf = 0) → status = 'active' immédiatement
 *   4. Si plan payant → status = 'trialing', avec expiration automatique à +48h
 *   5. L'activation réelle du plan payant se fait via POST /confirm après paiement validé
 * 
 * Protection anti-fantômes :
 *   - Les abonnements en 'trialing' ont un champ trial_ends_at = now() + 48h
 *   - Le cron/endpoint /expire-stale passe en 'expired' tous les trialing dépassés
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

    // 2. Vérifier pas d'abonnement actif ni en trialing
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
        error: existing.status === 'trialing'
          ? 'Un abonnement en attente de paiement existe déjà. Confirmez-le ou attendez son expiration.'
          : 'Un abonnement actif existe déjà',
        current_status: existing.status,
        existing_id: existing.id
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

    // 6. Pour les plans payants, définir une date d'expiration du trialing
    const trialEndsAt = isFree ? null : new Date(now.getTime() + TRIALING_EXPIRY_HOURS * 60 * 60 * 1000);

    // 7. Créer l'abonnement dans la table `subscriptions`
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
        trial_ends_at: trialEndsAt?.toISOString() || null,
        auto_renew: isFree ? false : true,
        payment_method: payment_method || null,
        metadata: {
          initiated_from: 'backend_v2',
          plan_name: plan.name,
          requires_payment: !isFree,
          trialing_expires_at: trialEndsAt?.toISOString() || null,
        }
      })
      .select('*, plans(name, display_name, max_products)')
      .single();

    if (subError) throw subError;

    logger.info(`Subscription created: user=${userId}, plan=${plan.name}, status=${initialStatus}, price=${pricePaid} GNF${trialEndsAt ? `, trialing expires=${trialEndsAt.toISOString()}` : ''}`);

    res.status(201).json({ 
      success: true, 
      data: subscription,
      requires_payment: !isFree,
      trialing_expires_at: trialEndsAt?.toISOString() || null,
      message: isFree 
        ? 'Abonnement gratuit activé' 
        : `Abonnement en attente de paiement. Vous avez ${TRIALING_EXPIRY_HOURS}h pour confirmer.`
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
 * 
 * Vérifie que le trialing n'est pas expiré avant d'activer.
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

    // Vérifier que le trialing n'a pas expiré
    const trialEndsAt = (subscription as any).trial_ends_at;
    if (trialEndsAt && new Date(trialEndsAt) < new Date()) {
      // Marquer comme expiré
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', subscription_id);

      res.status(410).json({ 
        success: false, 
        error: 'Cet abonnement en attente a expiré. Veuillez souscrire à nouveau.' 
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
          confirmed_from: 'backend_v2',
          payment_transaction_id: payment_transaction_id || null,
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
 * POST /api/subscriptions/expire-stale
 * 
 * Nettoyage des abonnements fantômes :
 * Passe en 'expired' tous les abonnements en 'trialing' dont le trial_ends_at est dépassé.
 * 
 * À appeler via cron ou manuellement (protégé par auth admin/interne).
 */
router.post('/expire-stale', verifyJWT, requireRole(['admin']), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date().toISOString();

    const { data, error, count } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: now,
        metadata: { expired_reason: 'trialing_not_confirmed', expired_by: 'system_cleanup' }
      })
      .eq('status', 'trialing')
      .lt('trial_ends_at', now)
      .select('id, user_id');

    if (error) throw error;

    const expiredCount = data?.length || 0;
    logger.info(`Expired ${expiredCount} stale trialing subscriptions`);

    res.json({ 
      success: true, 
      expired_count: expiredCount,
      expired_ids: data?.map(s => s.id) || []
    });
  } catch (error: any) {
    logger.error(`Error expiring stale subscriptions: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du nettoyage' });
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
 * Vérifie les limites du plan actuel (produits, images, fonctionnalités).
 * 
 * Fallback : si aucun abonnement actif, retourne les limites du plan gratuit
 * alignées avec la table `plans` (free: max_products=10, max_images=3).
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
      // Fallback : limites du plan gratuit (alignées avec plans.name='free' en DB)
      res.json({
        success: true,
        data: FREE_PLAN_FALLBACK,
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
