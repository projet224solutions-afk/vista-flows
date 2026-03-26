/**
 * 🏪 POS SYNC ROUTES - Phase 4
 * 
 * Synchronisation des ventes POS offline → backend.
 * 
 * Tables utilisées :
 *   - `pos_sales` : ventes POS
 *   - `pos_sale_items` : lignes de vente
 *   - `products` : décrémentation stock
 *   - `vendors` : résolution vendeur
 *   - `wallet_transactions` : crédit automatique du wallet vendeur
 * 
 * Gestion des conflits :
 *   - Idempotence via `local_sale_id` unique par vendeur
 *   - Les doublons sont silencieusement ignorés (réponse 200 avec flag)
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const PosSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().max(200),
  quantity: z.number().int().min(1).max(9999),
  unit_price: z.number().min(0),
  discount: z.number().min(0).default(0),
});

const PosSaleSchema = z.object({
  local_sale_id: z.string().min(1, 'local_sale_id requis').max(100),
  items: z.array(PosSaleItemSchema).min(1).max(100),
  payment_method: z.enum(['cash', 'mobile_money', 'card', 'credit']),
  total_amount: z.number().min(0),
  discount_total: z.number().min(0).default(0),
  customer_name: z.string().max(200).nullish(),
  customer_phone: z.string().max(20).nullish(),
  notes: z.string().max(500).nullish(),
  sold_at: z.string().datetime({ message: 'sold_at doit être ISO 8601' }),
});

const BatchSyncSchema = z.object({
  sales: z.array(PosSaleSchema).min(1, 'Au moins une vente').max(50, 'Maximum 50 ventes par lot'),
});

// ==================== ROUTES ====================

/**
 * POST /api/pos/sync
 * Synchronise un lot de ventes POS offline.
 * 
 * Chaque vente est identifiée par `local_sale_id` unique par vendeur.
 * Les doublons sont ignorés silencieusement.
 */
router.post('/sync', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Résoudre le vendeur
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const validation = BatchSyncSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const { sales } = validation.data;
    const results: Array<{
      local_sale_id: string;
      status: 'created' | 'duplicate' | 'error';
      sale_id?: string;
      error?: string;
    }> = [];

    for (const sale of sales) {
      try {
        // Vérifier si déjà synchronisé (idempotence via local_sale_id)
        const { data: existing } = await supabaseAdmin
          .from('pos_sales')
          .select('id')
          .eq('vendor_id', vendor.id)
          .eq('local_sale_id', sale.local_sale_id)
          .maybeSingle();

        if (existing) {
          results.push({
            local_sale_id: sale.local_sale_id,
            status: 'duplicate',
            sale_id: existing.id,
          });
          continue;
        }

        // Recalculer le total côté serveur
        const serverTotal = sale.items.reduce(
          (sum, item) => sum + (item.unit_price * item.quantity) - item.discount,
          0,
        );

        // Tolérance de 1% sur le total (différences d'arrondi)
        if (Math.abs(serverTotal - sale.total_amount) > sale.total_amount * 0.01) {
          logger.warn(`POS total mismatch: local=${sale.total_amount}, server=${serverTotal}, sale=${sale.local_sale_id}`);
        }

        // Créer la vente
        const { data: posSale, error: saleError } = await supabaseAdmin
          .from('pos_sales')
          .insert({
            vendor_id: vendor.id,
            local_sale_id: sale.local_sale_id,
            total_amount: serverTotal,
            discount_total: sale.discount_total,
            payment_method: sale.payment_method,
            customer_name: sale.customer_name,
            customer_phone: sale.customer_phone,
            notes: sale.notes,
            sold_at: sale.sold_at,
            synced_at: new Date().toISOString(),
            status: 'completed',
          })
          .select('id')
          .single();

        if (saleError) throw saleError;

        // Insérer les lignes de vente
        const saleItems = sale.items.map(item => ({
          pos_sale_id: posSale.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          total_price: (item.unit_price * item.quantity) - item.discount,
        }));

        await supabaseAdmin
          .from('pos_sale_items')
          .insert(saleItems);

        // Décrémenter le stock pour chaque produit
        for (const item of sale.items) {
          const { error: stockError } = await supabaseAdmin.rpc('decrement_product_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });

          if (stockError) {
            logger.warn(`POS stock decrement failed: product=${item.product_id}, qty=${item.quantity}: ${stockError.message}`);
          }
        }

        results.push({
          local_sale_id: sale.local_sale_id,
          status: 'created',
          sale_id: posSale.id,
        });
      } catch (saleError: any) {
        logger.error(`POS sync error for ${sale.local_sale_id}: ${saleError.message}`);
        results.push({
          local_sale_id: sale.local_sale_id,
          status: 'error',
          error: saleError.message,
        });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const duplicates = results.filter(r => r.status === 'duplicate').length;
    const errors = results.filter(r => r.status === 'error').length;

    logger.info(`POS sync: vendor=${vendor.id}, created=${created}, duplicates=${duplicates}, errors=${errors}`);

    res.json({
      success: errors === 0,
      data: {
        results,
        summary: { total: sales.length, created, duplicates, errors },
      },
    });
  } catch (error: any) {
    logger.error(`POS sync error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur de synchronisation POS' });
  }
});

/**
 * GET /api/pos/sales
 * Liste les ventes POS du vendeur (paginées)
 */
router.get('/sales', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
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

    const { data, error, count } = await supabaseAdmin
      .from('pos_sales')
      .select('*, pos_sale_items(*)', { count: 'exact' })
      .eq('vendor_id', vendor.id)
      .order('sold_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0 },
    });
  } catch (error: any) {
    logger.error(`POS sales list error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
