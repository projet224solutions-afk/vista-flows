/**
 * 📊 INVENTORY ROUTES - Phase 4
 *
 * Gestion du stock 100% côté backend Node.js.
 *
 * Tables utilisées :
 *   - `products` : stock_quantity (source de vérité)
 *   - `inventory_history` : journal des mouvements
 *   - `vendors` : résolution vendeur
 *
 * Opérations :
 *   - Consultation stock
 *   - Ajustement manuel (avec raison obligatoire)
 *   - Historique des mouvements
 *   - Alertes stock bas
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { inventoryRateLimit } from '../middlewares/routeRateLimiter.js';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const StockAdjustmentSchema = z.object({
  product_id: z.string().uuid('product_id invalide'),
  adjustment: z.number().int('L\'ajustement doit être un entier')
    .refine(val => val !== 0, 'L\'ajustement ne peut pas être 0'),
  reason: z.enum([
    'restock',
    'manual_correction',
    'damaged',
    'lost',
    'returned',
    'count_adjustment',
    'other',
  ]),
  notes: z.string().max(500).nullish(),
});

const BatchAdjustmentSchema = z.object({
  adjustments: z.array(StockAdjustmentSchema).min(1).max(100),
});

// ==================== HELPERS ====================

async function resolveVendorId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id || null;
}

// ==================== ROUTES ====================

/**
 * GET /api/inventory/stock
 * Vue d'ensemble du stock du vendeur
 */
router.get('/stock', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vendorId = await resolveVendorId(req.user!.id);
    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const lowStockOnly = req.query.low_stock === 'true';

    let query = supabaseAdmin
      .from('products')
      .select('id, name, sku, stock_quantity, low_stock_threshold, is_active, images')
      .eq('vendor_id', vendorId)
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true });

    if (lowStockOnly) {
      // Produits dont le stock est <= au seuil d'alerte
      query = query.not('low_stock_threshold', 'is', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    let products = data || [];

    // Filtrer côté serveur pour le seuil (PostgREST ne supporte pas column <= column)
    if (lowStockOnly) {
      products = products.filter(p =>
        p.low_stock_threshold !== null &&
        (p.stock_quantity ?? 0) <= p.low_stock_threshold
      );
    }

    // Statistiques résumées
    const totalProducts = products.length;
    const outOfStock = products.filter(p => (p.stock_quantity ?? 0) === 0).length;
    const lowStock = products.filter(p =>
      p.low_stock_threshold !== null &&
      (p.stock_quantity ?? 0) > 0 &&
      (p.stock_quantity ?? 0) <= p.low_stock_threshold
    ).length;

    res.json({
      success: true,
      data: products,
      summary: {
        total_products: totalProducts,
        out_of_stock: outOfStock,
        low_stock: lowStock,
        healthy: totalProducts - outOfStock - lowStock,
      },
    });
  } catch (error: any) {
    logger.error(`Inventory stock error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * POST /api/inventory/adjust
 * Ajustement de stock (unitaire ou par lot)
 *
 * Chaque ajustement :
 *   1. Vérifie que le produit appartient au vendeur
 *   2. Vérifie que le stock résultant ne sera pas négatif
 *   3. Met à jour le stock
 *   4. Enregistre le mouvement dans l'historique
 */
router.post('/adjust', verifyJWT, inventoryRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vendorId = await resolveVendorId(userId);
    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const validation = BatchAdjustmentSchema.safeParse(req.body);
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

    const { adjustments } = validation.data;
    const results: Array<{
      product_id: string;
      status: 'success' | 'error';
      old_stock?: number;
      new_stock?: number;
      error?: string;
    }> = [];

    for (const adj of adjustments) {
      try {
        // Vérifier propriété du produit
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('id, name, stock_quantity, vendor_id')
          .eq('id', adj.product_id)
          .eq('vendor_id', vendorId)
          .single();

        if (!product) {
          results.push({
            product_id: adj.product_id,
            status: 'error',
            error: 'Produit non trouvé ou non autorisé',
          });
          continue;
        }

        const oldStock = product.stock_quantity ?? 0;
        const newStock = oldStock + adj.adjustment;

        if (newStock < 0) {
          results.push({
            product_id: adj.product_id,
            status: 'error',
            old_stock: oldStock,
            error: `Stock résultant négatif (${oldStock} + ${adj.adjustment} = ${newStock})`,
          });
          continue;
        }

        // Mettre à jour le stock
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', adj.product_id);

        if (updateError) throw updateError;

        // Enregistrer le mouvement dans l'historique
        await supabaseAdmin
          .from('inventory_history')
          .insert({
            product_id: adj.product_id,
            vendor_id: vendorId,
            change_type: adj.adjustment > 0 ? 'addition' : 'subtraction',
            quantity_change: Math.abs(adj.adjustment),
            old_quantity: oldStock,
            new_quantity: newStock,
            reason: adj.reason,
            notes: adj.notes || null,
            performed_by: userId,
          });

        results.push({
          product_id: adj.product_id,
          status: 'success',
          old_stock: oldStock,
          new_stock: newStock,
        });

        logger.info(`Stock adjusted: product=${adj.product_id}, ${oldStock} → ${newStock} (${adj.reason})`);
      } catch (adjError: any) {
        results.push({
          product_id: adj.product_id,
          status: 'error',
          error: adjError.message,
        });
      }
    }

    const successes = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;

    res.json({
      success: errors === 0,
      data: { results, summary: { total: adjustments.length, successes, errors } },
    });
  } catch (error: any) {
    logger.error(`Inventory adjustment error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/inventory/history
 * Historique des mouvements de stock
 */
router.get('/history', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vendorId = await resolveVendorId(req.user!.id);
    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const productId = req.query.product_id as string;

    let query = supabaseAdmin
      .from('inventory_history')
      .select('*, product:products(id, name, sku)', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0 },
    });
  } catch (error: any) {
    logger.error(`Inventory history error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
