/**
 * 🏪 VENDORS ROUTES - Phase 3
 * 
 * Tables utilisées :
 *   - `vendors` : business_name, business_type, shop_slug, user_id, is_active, etc.
 *   - `profiles` : pour résolution user_id ↔ vendor
 * 
 * Toutes les colonnes sont alignées avec le schéma DB existant.
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * GET /api/vendors/me
 * Profil vendeur de l'utilisateur connecté
 */
router.get('/me', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Aucune boutique associée à ce compte' });
      return;
    }

    res.json({ success: true, data: vendor });
  } catch (error: any) {
    logger.error(`Error fetching vendor profile: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du profil vendeur' });
  }
});

/**
 * GET /api/vendors/:id
 * Profil public d'un vendeur (par id ou shop_slug)
 */
router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;

    // Tenter par UUID d'abord, sinon par shop_slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const query = supabaseAdmin
      .from('vendors')
      .select('id, business_name, business_type, shop_slug, description, logo_url, cover_image_url, city, country, rating, total_reviews, is_verified, delivery_enabled, delivery_base_price')
      .eq('is_active', true);

    const { data: vendor, error } = isUuid
      ? await query.eq('id', id).maybeSingle()
      : await query.eq('shop_slug', id).maybeSingle();

    if (error) throw error;

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    res.json({ success: true, data: vendor });
  } catch (error: any) {
    logger.error(`Error fetching vendor: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * PATCH /api/vendors/me
 * Mise à jour du profil vendeur (champs autorisés uniquement)
 */
router.patch('/me', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Champs modifiables par le vendeur (alignés avec la table vendors)
    const allowedFields = [
      'business_name', 'description', 'address', 'city', 'country',
      'neighborhood', 'phone', 'email', 'logo_url', 'cover_image_url',
      'delivery_enabled', 'delivery_base_price', 'delivery_price_per_km',
      'delivery_rush_bonus', 'latitude', 'longitude'
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

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('vendors')
      .update(updates)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    logger.info(`Vendor updated: user=${userId}, fields=${Object.keys(updates).join(',')}`);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Error updating vendor: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * GET /api/vendors/me/stats
 * Statistiques vendeur (nombre de produits, commandes, clients)
 */
router.get('/me/stats', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Résoudre vendor_id depuis user_id
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (vendorError || !vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const vendorId = vendor.id;

    // Compter produits actifs
    const { count: productCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('is_active', true);

    // Compter commandes
    const { count: orderCount } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId);

    // Clients uniques (customer_id distincts ayant commandé)
    const { data: customers } = await supabaseAdmin
      .from('orders')
      .select('customer_id')
      .eq('vendor_id', vendorId)
      .not('customer_id', 'is', null);

    const uniqueCustomers = new Set(customers?.map(c => c.customer_id)).size;

    res.json({
      success: true,
      data: {
        products_count: productCount || 0,
        orders_count: orderCount || 0,
        customers_count: uniqueCustomers,
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching vendor stats: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

export default router;
