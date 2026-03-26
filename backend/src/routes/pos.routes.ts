/**
 * 🏪 POS SYNC ROUTES - Phase 6 (P1 Optimized)
 * 
 * P1 Optimization:
 *   - Atomic RPC create_pos_sale_complete: 1 DB call per sale
 *   - Combines idempotence + insert sale + items + stock decrement
 *   - Reduces from 4 sequential calls to 1 per sale
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { posSyncRateLimit } from '../middlewares/routeRateLimiter.js';
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

// ==================== CONCURRENCY CONTROL ====================

const CONCURRENCY_LIMIT = 5;

async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then(r => { results.push(r); });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
      // Remove settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const settled = await Promise.race([executing[i].then(() => true), Promise.resolve(false)]);
        if (settled) executing.splice(i, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}

// ==================== ROUTES ====================

/**
 * POST /api/pos/sync
 * P1 OPTIMIZED: Uses atomic RPC create_pos_sale_complete (1 DB call per sale)
 * + controlled concurrency (max 5 parallel)
 */
router.post('/sync', verifyJWT, posSyncRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // TODO P2: Cache this lookup in Redis
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

    // Process sales with controlled concurrency
    const processSale = async (sale: typeof sales[number]) => {
      try {
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('create_pos_sale_complete', {
          p_vendor_id: vendor.id,
          p_local_sale_id: sale.local_sale_id,
          p_items: sale.items,
          p_payment_method: sale.payment_method,
          p_total_amount: sale.total_amount,
          p_discount_total: sale.discount_total,
          p_customer_name: sale.customer_name || null,
          p_customer_phone: sale.customer_phone || null,
          p_notes: sale.notes || null,
          p_sold_at: sale.sold_at,
        });

        if (rpcError) {
          logger.error(`POS RPC error for ${sale.local_sale_id}: ${rpcError.message}`);
          return {
            local_sale_id: sale.local_sale_id,
            status: 'error' as const,
            error: rpcError.message,
          };
        }

        const result = rpcResult as {
          status: 'created' | 'duplicate' | 'error';
          sale_id?: string;
          server_total?: number;
          stock_synced?: boolean;
          stock_error?: string;
          error?: string;
        };

        if (result.status === 'error') {
          logger.error(`POS sale error for ${sale.local_sale_id}: ${result.error}`);
          return {
            local_sale_id: sale.local_sale_id,
            status: 'error' as const,
            error: result.error,
          };
        }

        if (result.status === 'duplicate') {
          return {
            local_sale_id: sale.local_sale_id,
            status: 'duplicate' as const,
            sale_id: result.sale_id,
          };
        }

        // Log total mismatch warning (non-blocking)
        if (result.server_total && Math.abs(result.server_total - sale.total_amount) > sale.total_amount * 0.01) {
          logger.warn(`POS total mismatch: local=${sale.total_amount}, server=${result.server_total}, sale=${sale.local_sale_id}`);
        }

        if (!result.stock_synced) {
          logger.warn(`POS stock sync failed: sale=${sale.local_sale_id}: ${result.stock_error}`);
        }

        return {
          local_sale_id: sale.local_sale_id,
          status: 'created' as const,
          sale_id: result.sale_id,
          stock_synced: result.stock_synced ?? true,
        };
      } catch (saleError: any) {
        logger.error(`POS sync error for ${sale.local_sale_id}: ${saleError.message}`);
        return {
          local_sale_id: sale.local_sale_id,
          status: 'error' as const,
          error: saleError.message,
        };
      }
    };

    const results = await processWithConcurrency(sales, processSale, CONCURRENCY_LIMIT);

    const created = results.filter(r => r.status === 'created').length;
    const duplicates = results.filter(r => r.status === 'duplicate').length;
    const errors = results.filter(r => r.status === 'error').length;
    const stockPending = results.filter(r => (r as any).stock_synced === false).length;

    logger.info(`POS sync: vendor=${vendor.id}, created=${created}, duplicates=${duplicates}, errors=${errors}, stock_pending=${stockPending}`);

    res.json({
      success: errors === 0,
      data: {
        results,
        summary: { total: sales.length, created, duplicates, errors, stock_pending: stockPending },
      },
    });
  } catch (error: any) {
    logger.error(`POS sync error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur de synchronisation POS' });
  }
});
/**
 * GET /api/pos/sales
 */
router.get('/sales', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
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

    const { data, error, count } = await supabaseAdmin
      .from('pos_sales')
      .select('*, pos_sale_items(*)', { count: 'exact' })
      .eq('vendor_id', vendor.id)
      .order('sold_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ success: true, data: data || [], meta: { limit, offset, total: count || 0 } });
  } catch (error: any) {
    logger.error(`POS sales list error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/pos/reconciliation
 */
router.get('/reconciliation', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data: vendor } = await supabaseAdmin
      .from('vendors').select('id').eq('user_id', userId).maybeSingle();

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('pos_stock_reconciliation')
      .select('*, product:products(id, name, sku)')
      .eq('vendor_id', vendor.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    logger.error(`POS reconciliation error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
