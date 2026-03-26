/**
 * 📦 ORDERS ROUTES - Phase 4 (Production Hardened)
 * 
 * Corrections production :
 *   1. Devise → résolution dynamique via vendor.country (GNF par défaut)
 *   2. Flux atomique avec stratégie compensatoire explicite
 *   3. Rollback complet si une étape échoue
 * 
 * Flux escrow systématique :
 *   order → order_items → stock decrement → escrow
 *   Si une étape échoue : rollback de toutes les étapes précédentes.
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { idempotencyGuard } from '../middlewares/idempotency.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { orderCreateRateLimit } from '../middlewares/routeRateLimiter.js';
import { z } from 'zod';

const router = Router();

// ==================== DEVISE DYNAMIQUE ====================

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GN: 'GNF', CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF',
  NE: 'XOF', TG: 'XOF', BJ: 'XOF', CM: 'XAF', GA: 'XAF',
  CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF', FR: 'EUR',
  US: 'USD', GB: 'GBP', MA: 'MAD', DZ: 'DZD', TN: 'TND',
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR',
};
const DEFAULT_CURRENCY = 'GNF';

function resolveVendorCurrency(countryCode?: string | null): string {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}

// ==================== VALIDATION SCHEMAS ====================

const OrderItemSchema = z.object({
  product_id: z.string().uuid('product_id invalide'),
  quantity: z.number().int().min(1, 'Quantité minimum 1').max(9999, 'Quantité trop élevée'),
  variant_id: z.string().uuid().nullish(),
});

const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'Au moins un article requis').max(50, 'Maximum 50 articles'),
  vendor_id: z.string().uuid('vendor_id invalide'),
  shipping_address: z.object({
    full_name: z.string().trim().min(2).max(200),
    phone: z.string().trim().min(6).max(20),
    address_line: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(100),
    postal_code: z.string().max(20).nullish(),
    notes: z.string().max(500).nullish(),
  }),
  payment_method: z.enum(['card', 'mobile_money', 'wallet', 'cod']),
  payment_intent_id: z.string().max(500).nullish(),
  coupon_code: z.string().max(50).nullish(),
});

// ==================== COMPENSATORY ROLLBACK ====================

/**
 * Stratégie compensatoire explicite.
 * Chaque étape enregistre son rollback. En cas d'erreur, on exécute
 * tous les rollbacks dans l'ordre inverse.
 */
type RollbackFn = () => Promise<void>;

class TransactionSaga {
  private rollbacks: Array<{ step: string; fn: RollbackFn }> = [];
  private executed: string[] = [];

  addStep(step: string, rollbackFn: RollbackFn) {
    this.rollbacks.push({ step, fn: rollbackFn });
    this.executed.push(step);
  }

  async compensate(failedStep: string, failReason: string): Promise<string[]> {
    const compensated: string[] = [];
    logger.error(`SAGA COMPENSATE: failed at "${failedStep}" — ${failReason}`);

    // Exécuter les rollbacks dans l'ordre inverse
    for (const rb of [...this.rollbacks].reverse()) {
      try {
        await rb.fn();
        compensated.push(rb.step);
        logger.info(`SAGA ROLLBACK OK: ${rb.step}`);
      } catch (rbErr: any) {
        // Rollback échoué → alerte critique pour réconciliation manuelle
        logger.error(`SAGA ROLLBACK FAILED: ${rb.step} — ${rbErr.message}`);
      }
    }
    return compensated;
  }
}

// ==================== HELPERS ====================

async function validateAndReserveStock(
  items: z.infer<typeof OrderItemSchema>[],
  vendorId: string
): Promise<{
  valid: boolean;
  products: Array<{ id: string; name: string; price: number; stock_quantity: number; requested: number }>;
  errors: string[];
}> {
  const productIds = items.map(i => i.product_id);

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, price, stock_quantity, is_active, vendor_id')
    .in('id', productIds)
    .eq('vendor_id', vendorId)
    .eq('is_active', true);

  if (error) throw error;

  const errors: string[] = [];
  const validated: Array<{ id: string; name: string; price: number; stock_quantity: number; requested: number }> = [];

  for (const item of items) {
    const product = products?.find(p => p.id === item.product_id);

    if (!product) {
      errors.push(`Produit ${item.product_id} introuvable ou inactif`);
      continue;
    }

    if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
      errors.push(`Stock insuffisant pour "${product.name}": ${product.stock_quantity} dispo, ${item.quantity} demandé`);
      continue;
    }

    validated.push({
      id: product.id,
      name: product.name,
      price: product.price,
      stock_quantity: product.stock_quantity ?? 0,
      requested: item.quantity,
    });
  }

  return { valid: errors.length === 0, products: validated, errors };
}

// ==================== ROUTES ====================

/**
 * POST /api/orders
 * Créer une commande avec escrow systématique + saga compensatoire.
 * 
 * Flux atomique :
 *   Step 1: Créer order → rollback: delete order
 *   Step 2: Créer order_items → rollback: delete order_items
 *   Step 3: Décrémenter stock → rollback: increment stock
 *   Step 4: Créer escrow → rollback: delete escrow
 */
router.post('/', verifyJWT, orderCreateRateLimit, idempotencyGuard, async (req: AuthenticatedRequest, res: Response) => {
  const saga = new TransactionSaga();

  try {
    const userId = req.user!.id;

    // 1. Validation Zod
    const validation = CreateOrderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Données de commande invalides',
        details: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const { items, vendor_id, shipping_address, payment_method, payment_intent_id } = validation.data;

    // 2. Vérifier vendeur actif
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id, business_name, user_id, country')
      .eq('id', vendor_id)
      .eq('is_active', true)
      .single();

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendeur introuvable ou inactif' });
      return;
    }

    // Anti-auto-achat
    if (vendor.user_id === userId) {
      res.status(400).json({ success: false, error: 'Vous ne pouvez pas commander dans votre propre boutique' });
      return;
    }

    // 3. Résoudre la devise du vendeur
    const currency = resolveVendorCurrency(vendor.country);

    // 4. Valider stock + prix serveur
    const stockCheck = await validateAndReserveStock(items, vendor_id);
    if (!stockCheck.valid) {
      res.status(409).json({
        success: false,
        error: 'Problème de disponibilité',
        details: stockCheck.errors,
      });
      return;
    }

    // 5. Calculer totaux côté serveur
    const orderItems = stockCheck.products.map(product => {
      const item = items.find(i => i.product_id === product.id)!;
      return {
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: product.price * item.quantity,
        variant_id: item.variant_id || null,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
    const totalAmount = subtotal;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // ==================== STEP 1: Créer la commande ====================
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: userId,
        vendor_id,
        status: 'pending',
        payment_status: payment_method === 'cod' ? 'pending' : 'processing',
        payment_method,
        payment_intent_id: payment_intent_id || null,
        subtotal,
        total_amount: totalAmount,
        shipping_address,
        currency,
      })
      .select('*')
      .single();

    if (orderError) throw orderError;

    saga.addStep('create_order', async () => {
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      logger.info(`SAGA: Deleted order ${order.id}`);
    });

    // ==================== STEP 2: Insérer order_items ====================
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems.map(item => ({ ...item, order_id: order.id })));

    if (itemsError) {
      await saga.compensate('create_order_items', itemsError.message);
      res.status(500).json({ success: false, error: 'Erreur création articles' });
      return;
    }

    saga.addStep('create_order_items', async () => {
      await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
      logger.info(`SAGA: Deleted order_items for order ${order.id}`);
    });

    // ==================== STEP 3: Décrémenter le stock ====================
    const decrementedProducts: Array<{ id: string; qty: number }> = [];

    for (const product of stockCheck.products) {
      const { error: stockErr } = await supabaseAdmin.rpc('decrement_product_stock', {
        p_product_id: product.id,
        p_quantity: product.requested,
      });

      if (stockErr) {
        // Rollback des produits déjà décrémentés + étapes précédentes
        for (const dp of decrementedProducts) {
          await supabaseAdmin.rpc('increment_product_stock', {
            p_product_id: dp.id,
            p_quantity: dp.qty,
          });
        }
        await saga.compensate('decrement_stock', stockErr.message);
        res.status(500).json({ success: false, error: 'Erreur décrémentation stock' });
        return;
      }

      decrementedProducts.push({ id: product.id, qty: product.requested });
    }

    saga.addStep('decrement_stock', async () => {
      for (const dp of decrementedProducts) {
        await supabaseAdmin.rpc('increment_product_stock', {
          p_product_id: dp.id,
          p_quantity: dp.qty,
        });
      }
      logger.info(`SAGA: Restored stock for ${decrementedProducts.length} products`);
    });

    // ==================== STEP 4: Créer l'escrow ====================
    const { error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .insert({
        order_id: order.id,
        buyer_id: userId,
        seller_id: vendor.user_id,
        amount: totalAmount,
        currency,
        status: 'held',
        auto_release_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payment_method,
      });

    if (escrowError) {
      await saga.compensate('create_escrow', escrowError.message);
      res.status(500).json({ success: false, error: 'Erreur création escrow' });
      return;
    }

    // ✅ Toutes les étapes ont réussi
    logger.info(`Order created: ${order.id} (${orderNumber}), vendor=${vendor_id}, total=${totalAmount} ${currency}, escrow=held`);

    res.status(201).json({
      success: true,
      data: {
        order: { ...order, currency },
        items: orderItems,
        escrow_status: 'held',
      },
    });
  } catch (error: any) {
    // Erreur imprévue → compensation totale
    await saga.compensate('unexpected', error.message);
    logger.error(`Order creation error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de la commande' });
  }
});

/**
 * GET /api/orders/:orderId
 * Détails d'une commande (acheteur ou vendeur)
 */
router.get('/:orderId', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;

    // Charger la commande avec items
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    // Vérifier que l'utilisateur est soit l'acheteur, soit le vendeur
    const isCustomer = order.customer_id === userId;
    let isVendor = false;
    if (!isCustomer) {
      const { data: vendor } = await supabaseAdmin
        .from('vendors').select('id').eq('user_id', userId).eq('id', order.vendor_id).maybeSingle();
      isVendor = !!vendor;
    }

    if (!isCustomer && !isVendor) {
      res.status(403).json({ success: false, error: 'Accès non autorisé à cette commande' });
      return;
    }

    // Charger l'escrow associé
    const { data: escrow } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, status, auto_release_at, released_at, seller_confirmed_at')
      .eq('order_id', orderId)
      .maybeSingle();

    res.json({ success: true, data: { ...order, escrow: escrow || null } });
  } catch (error: any) {
    logger.error(`Error fetching order ${req.params.orderId}: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * POST /api/orders/:orderId/cancel
 * Annuler une commande (acheteur uniquement, si non confirmée par vendeur)
 */
router.post('/:orderId/cancel', verifyJWT, orderCreateRateLimit, idempotencyGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      res.status(400).json({ success: false, error: 'Raison d\'annulation requise (min 3 caractères)' });
      return;
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, customer_id, vendor_id, seller_confirmed_at')
      .eq('id', orderId)
      .eq('customer_id', userId)
      .single();

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    // Seules les commandes pending peuvent être annulées par l'acheteur
    if (order.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `Impossible d'annuler une commande en statut "${order.status}"`,
        details: { allowed_statuses: ['pending'] },
      });
      return;
    }

    // Si le vendeur a déjà confirmé, l'acheteur ne peut plus annuler
    if (order.seller_confirmed_at) {
      res.status(400).json({
        success: false,
        error: 'Le vendeur a confirmé cette commande, annulation impossible. Ouvrez un litige.',
      });
      return;
    }

    // Restaurer le stock
    const { data: orderItems } = await supabaseAdmin
      .from('order_items').select('product_id, quantity').eq('order_id', orderId);

    if (orderItems) {
      for (const item of orderItems) {
        await supabaseAdmin.rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }
    }

    // Mettre à jour l'escrow
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'refunded', released_at: new Date().toISOString() })
      .eq('order_id', orderId);

    // Mettre à jour la commande
    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) throw error;

    logger.info(`Order ${orderId} cancelled by buyer ${userId}: ${reason}`);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`Order cancellation error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'annulation' });
  }
});

/**
 * GET /api/orders/mine
 */
router.get('/mine', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [], meta: { limit, offset, total: count || 0 } });
  } catch (error: any) {
    logger.error(`Error fetching client orders: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/orders/vendor
 */
router.get('/vendor', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data: vendor } = await supabaseAdmin
      .from('vendors').select('id').eq('user_id', userId).maybeSingle();

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [], meta: { limit, offset, total: count || 0 } });
  } catch (error: any) {
    logger.error(`Error fetching vendor orders: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * PATCH /api/orders/:orderId/status
 */
router.patch('/:orderId/status', verifyJWT, orderCreateRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const statusSchema = z.object({
      status: z.enum(['confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']),
      tracking_number: z.string().max(100).nullish(),
      cancellation_reason: z.string().max(500).nullish(),
    });

    const validation = statusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validation.error.errors });
      return;
    }

    const { status, tracking_number, cancellation_reason } = validation.data;

    const { data: vendor } = await supabaseAdmin
      .from('vendors').select('id').eq('user_id', userId).maybeSingle();

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, vendor_id')
      .eq('id', orderId)
      .eq('vendor_id', vendor.id)
      .single();

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Transition "${order.status}" → "${status}" non autorisée`,
        allowed_transitions: allowed,
      });
      return;
    }

    if (status === 'cancelled' && !cancellation_reason) {
      res.status(400).json({ success: false, error: 'Raison d\'annulation requise' });
      return;
    }

    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (tracking_number) updates.tracking_number = tracking_number;
    if (cancellation_reason) updates.cancellation_reason = cancellation_reason;

    if (status === 'confirmed') {
      updates.seller_confirmed_at = new Date().toISOString();
      await supabaseAdmin
        .from('escrow_transactions')
        .update({
          seller_confirmed_at: new Date().toISOString(),
          cancellable: false,
          auto_release_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('order_id', orderId);
    }

    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('order_id', orderId);
    }

    if (status === 'cancelled') {
      const { data: orderItems } = await supabaseAdmin
        .from('order_items').select('product_id, quantity').eq('order_id', orderId);

      if (orderItems) {
        for (const item of orderItems) {
          await supabaseAdmin.rpc('increment_product_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });
        }
      }

      await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'refunded', released_at: new Date().toISOString() })
        .eq('order_id', orderId);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('orders').update(updates).eq('id', orderId).select('*').single();

    if (error) throw error;

    logger.info(`Order ${orderId} status: ${order.status} → ${status} by vendor=${vendor.id}`);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`Order status update error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
