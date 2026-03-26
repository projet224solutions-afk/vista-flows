/**
 * 📦 ORDERS ROUTES - Phase 4
 * 
 * Tables utilisées :
 *   - `orders` : commande principale
 *   - `order_items` : lignes de commande
 *   - `escrow_transactions` : séquestre systématique
 *   - `products` : vérification stock + prix
 *   - `vendors` : résolution vendeur
 * 
 * Flux : Escrow systématique pour toutes les commandes.
 * Stock : Géré côté backend (vérification + décrémentation atomique).
 * Idempotence : Header Idempotency-Key requis pour POST.
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { idempotencyGuard } from '../middlewares/idempotency.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { z } from 'zod';

const router = Router();

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

// ==================== HELPERS ====================

/**
 * Vérifie la disponibilité de stock pour tous les items.
 * Retourne les produits avec leur prix vérifié côté serveur.
 */
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
      errors.push(`Stock insuffisant pour "${product.name}": ${product.stock_quantity} disponible(s), ${item.quantity} demandé(s)`);
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

/**
 * Décrémente le stock de tous les produits d'une commande.
 * Opération effectuée après validation complète.
 */
async function decrementStock(items: Array<{ id: string; requested: number }>): Promise<void> {
  for (const item of items) {
    const { error } = await supabaseAdmin.rpc('decrement_product_stock', {
      p_product_id: item.id,
      p_quantity: item.requested,
    });

    if (error) {
      logger.error(`Stock decrement failed for product=${item.id}: ${error.message}`);
      throw new Error(`Erreur de décrémentation stock pour ${item.id}`);
    }
  }
}

// ==================== ROUTES ====================

/**
 * POST /api/orders
 * Créer une commande avec escrow systématique.
 * Requiert Idempotency-Key.
 * 
 * Flux :
 *   1. Valider le payload
 *   2. Vérifier le stock de chaque produit (serveur fait foi)
 *   3. Calculer le total côté serveur (prix DB, pas prix client)
 *   4. Créer la commande + order_items
 *   5. Décrémenter le stock
 *   6. Créer l'escrow
 */
router.post('/', verifyJWT, idempotencyGuard, async (req: AuthenticatedRequest, res: Response) => {
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

    // 2. Vérifier que le vendeur existe et est actif
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id, business_name, user_id')
      .eq('id', vendor_id)
      .eq('is_active', true)
      .single();

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendeur introuvable ou inactif' });
      return;
    }

    // Empêcher l'auto-achat
    if (vendor.user_id === userId) {
      res.status(400).json({ success: false, error: 'Vous ne pouvez pas commander dans votre propre boutique' });
      return;
    }

    // 3. Valider stock + récupérer prix serveur
    const stockCheck = await validateAndReserveStock(items, vendor_id);
    if (!stockCheck.valid) {
      res.status(409).json({
        success: false,
        error: 'Problème de disponibilité',
        details: stockCheck.errors,
      });
      return;
    }

    // 4. Calculer totaux côté serveur
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
    const totalAmount = subtotal; // TODO: ajouter frais de livraison, coupons

    // 5. Générer le numéro de commande
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 6. Créer la commande
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
        currency: 'XAF',
      })
      .select('*')
      .single();

    if (orderError) throw orderError;

    // 7. Insérer les order_items
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems.map(item => ({
        ...item,
        order_id: order.id,
      })));

    if (itemsError) {
      // Rollback de la commande
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw itemsError;
    }

    // 8. Décrémenter le stock
    await decrementStock(stockCheck.products);

    // 9. Créer l'escrow
    const { error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .insert({
        order_id: order.id,
        buyer_id: userId,
        seller_id: vendor.user_id,
        amount: totalAmount,
        currency: 'XAF',
        status: 'held',
        auto_release_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payment_method,
      });

    if (escrowError) {
      logger.error(`Escrow creation failed for order=${order.id}: ${escrowError.message}`);
      // La commande existe mais l'escrow a échoué — alerte admin
    }

    logger.info(`Order created: ${order.id} (${orderNumber}), vendor=${vendor_id}, total=${totalAmount} XAF, escrow=held`);

    res.status(201).json({
      success: true,
      data: {
        order,
        items: orderItems,
        escrow_status: escrowError ? 'failed' : 'held',
      },
    });
  } catch (error: any) {
    logger.error(`Order creation error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de la commande' });
  }
});

/**
 * GET /api/orders/mine
 * Commandes du client connecté (paginées)
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

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0 },
    });
  } catch (error: any) {
    logger.error(`Error fetching client orders: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/orders/vendor
 * Commandes reçues par le vendeur connecté
 */
router.get('/vendor', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

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

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0 },
    });
  } catch (error: any) {
    logger.error(`Error fetching vendor orders: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * PATCH /api/orders/:orderId/status
 * Mise à jour du statut par le vendeur (confirmed, shipped, delivered)
 */
router.patch('/:orderId/status', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
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
      res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: validation.error.errors,
      });
      return;
    }

    const { status, tracking_number, cancellation_reason } = validation.data;

    // Vérifier que la commande appartient au vendeur
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

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

    // Vérifier les transitions de statut autorisées
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

    // Si annulation, requérir une raison
    if (status === 'cancelled' && !cancellation_reason) {
      res.status(400).json({ success: false, error: 'Raison d\'annulation requise' });
      return;
    }

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (tracking_number) updates.tracking_number = tracking_number;
    if (cancellation_reason) updates.cancellation_reason = cancellation_reason;

    // Si le vendeur confirme, mettre à jour l'escrow
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

    // Si livré, libérer l'escrow
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();

      await supabaseAdmin
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);
    }

    // Si annulé, restaurer le stock et annuler l'escrow
    if (status === 'cancelled') {
      // Restaurer le stock
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (orderItems) {
        for (const item of orderItems) {
          await supabaseAdmin.rpc('increment_product_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });
        }
      }

      // Annuler l'escrow
      await supabaseAdmin
        .from('escrow_transactions')
        .update({
          status: 'refunded',
          released_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) throw error;

    logger.info(`Order ${orderId} status: ${order.status} → ${status} by vendor=${vendor.id}`);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`Order status update error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
