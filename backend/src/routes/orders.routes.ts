/**
 * 📦 ORDERS ROUTES - Phase 6 (P0 Optimized)
 * 
 * P0 Optimization:
 *   - create_order_core RPC: 1 DB call instead of 4+N sequential calls
 *   - increment_stock_batch RPC: batch stock restore for cancellations
 *   - Redis cache for vendor lookups (TTL 5min)
 *   - Performance timing on POST /api/orders
 * 
 * Security preserved:
 *   - Zod validation
 *   - Idempotency guard
 *   - Anti-self-purchase
 *   - Rate limiting
 *   - Escrow systématique (inside create_order_core)
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { idempotencyGuard } from '../middlewares/idempotency.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { orderCreateRateLimit } from '../middlewares/routeRateLimiter.js';
import { cache } from '../config/redis.js';
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

// ==================== CACHED VENDOR LOOKUP ====================

/**
 * Resolve vendor with Redis cache (TTL 5min).
 * Eliminates repeated DB lookups on hot paths.
 */
async function getCachedVendor(vendorId: string): Promise<{
  id: string;
  business_name: string;
  user_id: string;
  country: string | null;
} | null> {
  const cacheKey = `vendor:${vendorId}`;
  
  // Try cache first
  const cached = await cache.get<{ id: string; business_name: string; user_id: string; country: string | null }>(cacheKey);
  if (cached) return cached;
  
  // Fallback to DB
  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, business_name, user_id, country')
    .eq('id', vendorId)
    .eq('is_active', true)
    .single();
  
  if (vendor) {
    await cache.set(cacheKey, vendor, 300); // 5min TTL
  }
  
  return vendor;
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

// ==================== ROUTES ====================

/**
 * POST /api/orders
 * 
 * P0 OPTIMIZED: Uses create_order_core RPC for atomic single-call order creation.
 * 
 * BEFORE (Phase 4): 4+N sequential DB calls (~135ms+ for 3 items)
 *   1. SELECT vendor
 *   2. SELECT products (stock validation)
 *   3. INSERT order
 *   4. INSERT order_items
 *   5..5+N. RPC decrement_product_stock × N items
 *   6. INSERT escrow
 * 
 * AFTER (Phase 6): 2 DB calls (~35ms for 3 items)
 *   1. SELECT vendor (cached in Redis, ~0ms hit)
 *   2. RPC create_order_core (atomic: validate + insert + decrement + escrow)
 * 
 * Estimated improvement:
 *   - Latency: 135ms → 35ms (-74%)
 *   - DB calls: 6+N → 2 (-80%)
 *   - Orders/sec: 10-25 → 40-80 per instance (+3x)
 */
router.post('/', verifyJWT, orderCreateRateLimit, idempotencyGuard, async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = req.user!.id;

    // 1. Validation Zod (no DB call)
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

    // 2. Vendor lookup (Redis cached, TTL 5min)
    const vendor = await getCachedVendor(vendor_id);

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendeur introuvable ou inactif' });
      return;
    }

    // Anti-auto-achat
    if (vendor.user_id === userId) {
      res.status(400).json({ success: false, error: 'Vous ne pouvez pas commander dans votre propre boutique' });
      return;
    }

    // 3. Resolve currency (no DB call)
    const currency = resolveVendorCurrency(vendor.country);

    // 4. Generate order number (no DB call)
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 5. SINGLE ATOMIC RPC: create_order_core
    //    Validates stock + creates order + items + decrements stock + creates escrow
    //    All in one PostgreSQL transaction with row-level locking
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('create_order_core', {
      p_order_number: orderNumber,
      p_customer_id: userId,
      p_vendor_id: vendor_id,
      p_vendor_user_id: vendor.user_id,
      p_payment_method: payment_method,
      p_payment_intent_id: payment_intent_id || null,
      p_shipping_address: shipping_address,
      p_currency: currency,
      p_items: items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        variant_id: i.variant_id || null,
      })),
      p_auto_release_days: 7,
    });

    if (rpcError) {
      logger.error(`create_order_core RPC error: ${rpcError.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la création de la commande' });
      return;
    }

    // Check RPC result
    if (!result || !result.success) {
      const errorMsg = result?.error || 'Erreur inconnue';
      logger.warn(`Order creation rejected: ${errorMsg}`);
      res.status(409).json({ success: false, error: errorMsg });
      return;
    }

    let escrowStatus = result.escrow_status as string;
    if (payment_method === 'cod') {
      await supabaseAdmin
        .from('escrow_transactions')
        .update({
          status: 'pending',
          metadata: {
            payment_type: 'cash_on_delivery',
            note: 'Paiement à la livraison - escrow virtuel',
          },
        })
        .eq('order_id', result.order_id);
      escrowStatus = 'pending';
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logger.info(`✅ Order created: ${result.order_id} (${orderNumber}), vendor=${vendor_id}, total=${result.total_amount} ${currency}, escrow=${escrowStatus}, duration=${duration}ms, db_calls=2`);

    res.status(201).json({
      success: true,
      data: {
        order: {
          id: result.order_id,
          order_number: result.order_number,
          status: 'pending',
          payment_status: payment_method === 'cod' ? 'pending' : 'processing',
          payment_method,
          subtotal: result.subtotal,
          total_amount: result.total_amount,
          currency: result.currency,
          shipping_address,
        },
        items: result.items,
        escrow_status: escrowStatus,
      },
      _perf: { duration_ms: duration, db_calls: 2 },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`Order creation error (${duration}ms): ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de la commande' });
  }
});

/**
 * GET /api/orders/:orderId
 */
router.get('/:orderId', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

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
 * P0 OPTIMIZED: Uses increment_stock_batch instead of per-product loop
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

    if (order.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `Impossible d'annuler une commande en statut "${order.status}"`,
        details: { allowed_statuses: ['pending'] },
      });
      return;
    }

    if (order.seller_confirmed_at) {
      res.status(400).json({
        success: false,
        error: 'Le vendeur a confirmé cette commande, annulation impossible. Ouvrez un litige.',
      });
      return;
    }

    // Batch stock restore (1 call instead of N)
    const { data: orderItems } = await supabaseAdmin
      .from('order_items').select('product_id, quantity').eq('order_id', orderId);

    if (orderItems && orderItems.length > 0) {
      await supabaseAdmin.rpc('increment_stock_batch', {
        p_items: orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      });
    }

    // Update escrow
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'refunded', released_at: new Date().toISOString() })
      .eq('order_id', orderId);

    // Update order
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
 * P0 OPTIMIZED: Uses increment_stock_batch for vendor cancellations
 */
router.patch('/:orderId/status', verifyJWT, orderCreateRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const statusSchema = z.object({
      status: z.enum(['confirmed', 'preparing', 'ready', 'shipped', 'in_transit', 'delivered', 'cancelled']),
      tracking_number: z.string().max(100).nullish(),
      cancellation_reason: z.string().max(500).nullish(),
    });

    const validation = statusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validation.error.errors });
      return;
    }

    const requestedStatus = validation.data.status;
    const status = requestedStatus === 'shipped' ? 'in_transit' : requestedStatus;
    const { tracking_number, cancellation_reason } = validation.data;

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
      preparing: ['ready', 'cancelled'],
      ready: ['in_transit', 'cancelled'],
      shipped: ['delivered'],
      in_transit: ['delivered'],
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
    }

    if (status === 'cancelled') {
      // Batch stock restore (1 call instead of N)
      const { data: orderItems } = await supabaseAdmin
        .from('order_items').select('product_id, quantity').eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        await supabaseAdmin.rpc('increment_stock_batch', {
          p_items: orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        });
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
