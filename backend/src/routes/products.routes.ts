/**
 * 📦 PRODUCTS ROUTES - Phase 3
 * 
 * Tables utilisées :
 *   - `products` : name, price, images, vendor_id, is_active, stock_quantity, etc.
 *   - `vendors` : pour résoudre vendor_id depuis user_id
 *   - `plans` + `subscriptions` : pour appliquer les limites max_products et max_images_per_product
 * 
 * Limites appliquées côté backend :
 *   1. max_products — blocage de la création si quota atteint
 *   2. max_images_per_product — troncature automatique du tableau images[]
 * 
 * Le trigger DB `trg_enforce_product_limit` reste actif comme filet de sécurité,
 * mais le backend valide AVANT pour donner des messages d'erreur explicites.
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

// Fallback plan gratuit (source de vérité : table `plans` WHERE name = 'free')
const FREE_PLAN_LIMITS = {
  max_products: 10,
  max_images_per_product: 3,
} as const;

// ==================== HELPERS ====================

/**
 * Résout le vendor_id depuis le user_id authentifié
 */
async function resolveVendorId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id || null;
}

/**
 * Récupère les limites du plan actif du vendeur.
 * Fallback vers les limites du plan gratuit si aucun abonnement actif.
 */
async function getVendorLimits(userId: string): Promise<{
  max_products: number | null;
  max_images_per_product: number | null;
  plan_name: string;
}> {
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plans(name, max_products, max_images_per_product)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = (sub as any)?.plans;
  if (plan) {
    return {
      max_products: plan.max_products,
      max_images_per_product: plan.max_images_per_product,
      plan_name: plan.name,
    };
  }

  return {
    max_products: FREE_PLAN_LIMITS.max_products,
    max_images_per_product: FREE_PLAN_LIMITS.max_images_per_product,
    plan_name: 'free',
  };
}

/**
 * Compte les produits actifs d'un vendeur
 */
async function countActiveProducts(vendorId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .eq('is_active', true);
  return count || 0;
}

// ==================== ROUTES ====================

/**
 * GET /api/products/mine
 * Liste les produits du vendeur connecté (paginé)
 */
router.get('/mine', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vendorId = await resolveVendorId(req.user!.id);
    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const activeOnly = req.query.active !== 'false';

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0, hasMore: (offset + limit) < (count || 0) }
    });
  } catch (error: any) {
    logger.error(`Error listing products: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/products/limits
 * Retourne les limites du plan + usage actuel du vendeur
 */
router.get('/limits', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vendorId = await resolveVendorId(userId);
    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const [limits, currentCount] = await Promise.all([
      getVendorLimits(userId),
      countActiveProducts(vendorId),
    ]);

    const canCreate = limits.max_products === null || currentCount < limits.max_products;

    res.json({
      success: true,
      data: {
        plan_name: limits.plan_name,
        max_products: limits.max_products,
        max_images_per_product: limits.max_images_per_product,
        current_products: currentCount,
        can_create: canCreate,
        remaining: limits.max_products === null ? null : Math.max(0, limits.max_products - currentCount),
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching product limits: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * POST /api/products
 * Créer un produit — avec validation des limites du plan
 * 
 * Contrôles effectués :
 *   1. L'utilisateur a une boutique (vendor_id résolu)
 *   2. Le nombre de produits actifs < max_products du plan
 *   3. Le nombre d'images <= max_images_per_product du plan (troncature si dépassement)
 */
router.post('/', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vendorId = await resolveVendorId(userId);

    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée. Créez d\'abord votre boutique.' });
      return;
    }

    // 1. Vérifier les limites du plan
    const [limits, currentCount] = await Promise.all([
      getVendorLimits(userId),
      countActiveProducts(vendorId),
    ]);

    // 2. Bloquer si quota max_products atteint
    if (limits.max_products !== null && currentCount >= limits.max_products) {
      logger.warn(`Product creation blocked: vendor=${vendorId}, current=${currentCount}, max=${limits.max_products}, plan=${limits.plan_name}`);
      res.status(403).json({
        success: false,
        error: 'Limite de produits atteinte',
        message: `Votre plan "${limits.plan_name}" autorise ${limits.max_products} produits actifs. Vous en avez ${currentCount}. Passez à un plan supérieur pour en ajouter davantage.`,
        current: currentCount,
        max: limits.max_products,
        plan: limits.plan_name,
      });
      return;
    }

    // 3. Contrôler et tronquer les images si nécessaire
    let images: string[] = req.body.images || [];
    let imagesTruncated = false;

    if (limits.max_images_per_product !== null && images.length > limits.max_images_per_product) {
      logger.info(`Images truncated: ${images.length} → ${limits.max_images_per_product} for vendor=${vendorId}, plan=${limits.plan_name}`);
      images = images.slice(0, limits.max_images_per_product);
      imagesTruncated = true;
    }

    // 4. Construire l'objet produit (colonnes alignées avec la table `products`)
    const productData: Record<string, any> = {
      vendor_id: vendorId,
      name: req.body.name,
      price: req.body.price,
      images,
      description: req.body.description || null,
      category_id: req.body.category_id || null,
      stock_quantity: req.body.stock_quantity ?? 0,
      is_active: req.body.is_active ?? true,
      compare_price: req.body.compare_price || null,
      cost_price: req.body.cost_price || null,
      sku: req.body.sku || null,
      tags: req.body.tags || null,
      weight: req.body.weight || null,
      dimensions: req.body.dimensions || null,
      free_shipping: req.body.free_shipping ?? false,
      low_stock_threshold: req.body.low_stock_threshold || null,
      seo_title: req.body.seo_title || null,
      seo_description: req.body.seo_description || null,
      sell_by_carton: req.body.sell_by_carton ?? false,
      price_carton: req.body.price_carton || null,
      units_per_carton: req.body.units_per_carton || null,
      carton_sku: req.body.carton_sku || null,
    };

    // Validation minimale
    if (!productData.name || typeof productData.name !== 'string' || productData.name.trim().length < 2) {
      res.status(400).json({ success: false, error: 'Le nom du produit est requis (min 2 caractères)' });
      return;
    }
    if (productData.price === undefined || productData.price === null || productData.price < 0) {
      res.status(400).json({ success: false, error: 'Le prix est requis et doit être >= 0' });
      return;
    }

    // 5. Insérer le produit
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert(productData)
      .select('*')
      .single();

    if (error) {
      // Intercepter l'erreur du trigger DB (filet de sécurité)
      if (error.message?.includes('limit') || error.message?.includes('maximum')) {
        res.status(403).json({
          success: false,
          error: 'Limite de produits atteinte (validation DB)',
          message: error.message,
        });
        return;
      }
      throw error;
    }

    logger.info(`Product created: ${product.id} by vendor=${vendorId}, plan=${limits.plan_name}, count=${currentCount + 1}/${limits.max_products || '∞'}`);

    res.status(201).json({
      success: true,
      data: product,
      warnings: imagesTruncated
        ? [`Images tronquées à ${limits.max_images_per_product} (limite du plan "${limits.plan_name}")`]
        : undefined,
    });
  } catch (error: any) {
    logger.error(`Error creating product: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la création du produit' });
  }
});

/**
 * PATCH /api/products/:productId
 * Mise à jour d'un produit existant — avec contrôle max_images_per_product
 */
router.patch('/:productId', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;
    const vendorId = await resolveVendorId(userId);

    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    // Vérifier que le produit appartient bien au vendeur
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, vendor_id')
      .eq('id', productId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ success: false, error: 'Produit non trouvé' });
      return;
    }

    if (existing.vendor_id !== vendorId) {
      res.status(403).json({ success: false, error: 'Ce produit ne vous appartient pas' });
      return;
    }

    // Champs modifiables
    const allowedFields = [
      'name', 'price', 'description', 'category_id', 'stock_quantity',
      'is_active', 'compare_price', 'cost_price', 'sku', 'tags', 'weight',
      'dimensions', 'free_shipping', 'low_stock_threshold', 'images',
      'seo_title', 'seo_description', 'sell_by_carton', 'price_carton',
      'units_per_carton', 'carton_sku',
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
      return;
    }

    // Contrôle images si mises à jour
    let imagesTruncated = false;
    if (updates.images && Array.isArray(updates.images)) {
      const limits = await getVendorLimits(userId);
      if (limits.max_images_per_product !== null && updates.images.length > limits.max_images_per_product) {
        updates.images = updates.images.slice(0, limits.max_images_per_product);
        imagesTruncated = true;
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select('*')
      .single();

    if (error) throw error;

    logger.info(`Product updated: ${productId} by vendor=${vendorId}`);
    res.json({
      success: true,
      data,
      warnings: imagesTruncated
        ? [`Images tronquées à la limite du plan`]
        : undefined,
    });
  } catch (error: any) {
    logger.error(`Error updating product: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * DELETE /api/products/:productId
 * Soft-delete (is_active = false) ou hard-delete selon le paramètre
 */
router.delete('/:productId', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;
    const hardDelete = req.query.hard === 'true';
    const vendorId = await resolveVendorId(userId);

    if (!vendorId) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    // Vérifier propriété
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id, vendor_id')
      .eq('id', productId)
      .single();

    if (!existing || existing.vendor_id !== vendorId) {
      res.status(404).json({ success: false, error: 'Produit non trouvé ou non autorisé' });
      return;
    }

    if (hardDelete) {
      const { error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
      logger.info(`Product hard-deleted: ${productId} by vendor=${vendorId}`);
    } else {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
      logger.info(`Product soft-deleted: ${productId} by vendor=${vendorId}`);
    }

    res.json({ success: true, message: hardDelete ? 'Produit supprimé définitivement' : 'Produit désactivé' });
  } catch (error: any) {
    logger.error(`Error deleting product: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
  }
});

export default router;
