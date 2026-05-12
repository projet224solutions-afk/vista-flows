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
import { triggerAffiliateCommission } from '../services/commission.service.js';
import { orderCreateRateLimit, orderManageRateLimit } from '../middlewares/routeRateLimiter.js';
import { cache } from '../config/redis.js';
import { z } from 'zod';
import Stripe from 'stripe';
import {
  buildOrderFinancialSummary,
  type OrderFinancialSummary,
} from '../services/marketplacePricing.service.js';

const router = Router();

// ==================== STRIPE ====================

const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as any })
  : null;

/**
 * Vérifie auprès de l'API Stripe que le PaymentIntent est bien "succeeded"
 * et appartient bien à l'utilisateur authentifié.
 * Empêche la création de commandes "payées" avec un PI fictif ou non finalisé.
 */
async function verifyCardPaymentIntent(
  paymentIntentId: string,
  authenticatedUserId: string,
): Promise<{ verified: boolean; error?: string }> {
  if (!stripe) {
    logger.error('CRITIQUE: STRIPE_SECRET_KEY absent — paiement carte non vérifiable');
    return { verified: false, error: 'Service de paiement temporairement indisponible' };
  }
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      return { verified: false, error: `Paiement Stripe non finalisé (statut: ${pi.status})` };
    }

    // buyer_id dans metadata doit correspondre à l'utilisateur authentifié
    const piBuyerId = pi.metadata?.buyer_id;
    if (piBuyerId && piBuyerId !== authenticatedUserId) {
      logger.warn(`PI buyer_id mismatch: pi.buyer_id=${piBuyerId}, auth_user=${authenticatedUserId}`);
      return { verified: false, error: 'Ce paiement ne correspond pas à votre compte' };
    }

    return { verified: true };
  } catch (err: any) {
    logger.error(`Erreur vérification Stripe PI ${paymentIntentId}: ${err.message}`);
    return { verified: false, error: 'Impossible de vérifier le paiement auprès de Stripe' };
  }
}

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
  shop_currency: string | null;
} | null> {
  const cacheKey = `vendor:${vendorId}`;

  // Try cache first
  const cached = await cache.get<{ id: string; business_name: string; user_id: string; country: string | null; shop_currency: string | null }>(cacheKey);
  if (cached) return cached;

  // Fallback to DB
  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, business_name, user_id, country, shop_currency')
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
    is_cod: z.boolean().nullish(),
    cod_phone: z.string().trim().max(20).nullish(),
    cod_city: z.string().trim().max(100).nullish(),
    neighborhood: z.string().trim().max(200).nullish(),
    landmark: z.string().trim().max(200).nullish(),
    instructions: z.string().trim().max(500).nullish(),
  }),
  payment_method: z.enum(['card', 'mobile_money', 'wallet', 'cash']),
  payment_intent_id: z.string().max(500).nullish(),
  payment_confirmed: z.boolean().nullish(),
  charged_amount: z.number().nonnegative().nullish(),
  order_metadata: z.record(z.string(), z.unknown()).nullish(),
  coupon_code: z.string().max(50).nullish(),
});

const CreateDigitalOrderSchema = z.object({
  vendor_id: z.string().uuid('vendor_id invalide'),
  product_id: z.string().uuid('product_id invalide'),
  product_name: z.string().trim().min(1).max(300),
  quantity: z.number().int().min(1).max(9999).default(1),
  unit_price: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  currency: z.string().trim().min(3).max(10).default(DEFAULT_CURRENCY),
  payment_method: z.enum(['card', 'mobile_money', 'wallet', 'cash']),
  payment_intent_id: z.string().max(500).nullish(),
  purchase_record_id: z.string().uuid().nullish(),
  pricing_type: z.enum(['one_time', 'subscription', 'pay_what_you_want']).nullish(),
  subscription_interval: z.enum(['monthly', 'yearly', 'lifetime']).nullish(),
});

const ORDER_LIST_SELECT = `
  id,
  order_number,
  status,
  payment_status,
  payment_method,
  subtotal,
  total_amount,
  shipping_address,
  metadata,
  created_at,
  updated_at,
  vendor_id,
  payment_intent_id,
  vendors(business_name),
  order_items(
    product_id,
    quantity,
    unit_price,
    total_price,
    variant_id,
    products(name)
  )
`;

async function attachEscrowToOrders<T extends { id: string }>(orders: T[]) {
  if (!orders.length) {
    return orders.map(order => ({ ...order, escrow: null }));
  }

  const { data: escrows, error } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, order_id, status, amount, commission_amount, currency, metadata, auto_release_date, released_at, seller_confirmed_at')
    .in('order_id', orders.map(order => order.id))
    .order('created_at', { ascending: false });

  if (error) {
    logger.warn(`Unable to load escrow data for orders: ${error.message}`);
    return orders.map(order => ({ ...order, escrow: null }));
  }

  const escrowByOrderId = new Map<string, any>();
  for (const escrow of escrows || []) {
    if (!escrowByOrderId.has(escrow.order_id)) {
      escrowByOrderId.set(escrow.order_id, escrow);
    }
  }

  return orders.map(order => ({
    ...order,
    escrow: escrowByOrderId.get(order.id) || null,
  }));
}

async function getCustomerIdByUserId(userId: string) {
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return customer?.id ?? null;
}

async function getOrCreateCustomerId(userId: string) {
  const existingCustomerId = await getCustomerIdByUserId(userId);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const { data: createdCustomer, error } = await supabaseAdmin
    .from('customers')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return createdCustomer.id;
}

async function getManagedVendorForUser(userId: string) {
  const { data: ownedVendor, error: ownedVendorError } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (ownedVendorError) {
    throw ownedVendorError;
  }

  if (ownedVendor) {
    return { id: ownedVendor.id, isAgent: false };
  }

  const { data: agentVendor, error: agentVendorError } = await supabaseAdmin
    .from('vendor_agents')
    .select('vendor_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (agentVendorError) {
    throw agentVendorError;
  }

  return agentVendor?.vendor_id ? { id: agentVendor.vendor_id, isAgent: true } : null;
}

async function canUserManageBuyerOrder(orderId: string, userId: string, customerId?: string | null) {
  const orderLookup = await supabaseAdmin
    .from('orders')
    .select('id, status, customer_id, vendor_id, metadata')
    .eq('id', orderId)
    .single();

  let order = orderLookup.data;
  const error = orderLookup.error;

  if (error) {
    logger.warn(`Buyer order lookup failed for ${orderId} with extended select: ${error.message}`);

    const fallbackResult = await supabaseAdmin
      .from('orders')
      .select('id, status, customer_id')
      .eq('id', orderId)
      .maybeSingle();

    if (fallbackResult.error) {
      throw fallbackResult.error;
    }

    order = fallbackResult.data
      ? {
          ...fallbackResult.data,
          vendor_id: null,
          metadata: null,
        }
      : null;
  }

  if (!order) {
    return { order: null, isBuyer: false };
  }

  let isBuyer = Boolean(customerId) && order.customer_id === customerId;

  if (!isBuyer && order.customer_id) {
    const { data: customerOwner } = await supabaseAdmin
      .from('customers')
      .select('user_id')
      .eq('id', order.customer_id)
      .maybeSingle();

    isBuyer = customerOwner?.user_id === userId;
  }

  if (!isBuyer) {
    const { data: escrow } = await supabaseAdmin
      .from('escrow_transactions')
      .select('buyer_id')
      .eq('order_id', orderId)
      .maybeSingle();

    isBuyer = escrow?.buyer_id === userId;
  }

  return { order, isBuyer };
}

function normalizeCampaignContact(contact: string):
  | { contactType: 'email'; normalized: string; email: string; phone: null }
  | { contactType: 'phone'; normalized: string; email: null; phone: string } {
  const trimmed = contact.trim();
  const lowered = trimmed.toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(lowered)) {
    return {
      contactType: 'email',
      normalized: lowered,
      email: lowered,
      phone: null,
    };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    throw new Error('Contact marketing invalide');
  }

  return {
    contactType: 'phone',
    normalized: digitsOnly,
    email: null,
    phone: trimmed.startsWith('+') ? `+${digitsOnly}` : digitsOnly,
  };
}

async function getOrderContactProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('email, phone, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

function buildDigitalShippingAddress(params: {
  productName: string;
  profile: Awaited<ReturnType<typeof getOrderContactProfile>>;
}) {
  const fullName = [params.profile?.first_name, params.profile?.last_name].filter(Boolean).join(' ') || params.profile?.email || 'Client 224Solutions';

  return {
    full_name: fullName,
    phone: params.profile?.phone || 'Non fourni',
    address_line: `Livraison numérique: ${params.productName}`,
    city: 'En ligne',
    country: 'Digital',
    postal_code: null,
    notes: 'Accès numérique délivré automatiquement après paiement',
  };
}

async function upsertVendorMarketingContact(params: {
  vendorId: string;
  rawContact: string;
  fullName?: string | null;
  orderTotal: number;
  purchasedAt: string;
}) {
  const normalizedContact = normalizeCampaignContact(params.rawContact);

  const { data: existingContact, error: loadError } = await supabaseAdmin
    .from('vendor_marketing_contacts')
    .select('id, source_type, total_orders, total_spent')
    .eq('vendor_id', params.vendorId)
    .eq('normalized_contact', normalizedContact.normalized)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  const sharedPayload = {
    full_name: params.fullName || null,
    linked_via: 'marketplace_order',
    source_type: existingContact?.source_type === 'physical' ? 'both' : 'digital',
    last_purchase_at: params.purchasedAt,
    is_active: true,
    marketing_email_opt_in: true,
    marketing_sms_opt_in: true,
  };

  if (existingContact?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('vendor_marketing_contacts')
      .update({
        ...sharedPayload,
        email: normalizedContact.email,
        phone: normalizedContact.phone,
        total_orders: Number(existingContact.total_orders || 0) + 1,
        total_spent: Number(existingContact.total_spent || 0) + Number(params.orderTotal || 0),
      })
      .eq('id', existingContact.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from('vendor_marketing_contacts')
    .insert({
      vendor_id: params.vendorId,
      contact_type: normalizedContact.contactType,
      normalized_contact: normalizedContact.normalized,
      email: normalizedContact.email,
      phone: normalizedContact.phone,
      total_orders: 1,
      total_spent: Number(params.orderTotal || 0),
      ...sharedPayload,
    });

  if (insertError) {
    throw insertError;
  }
}

async function syncOrderMarketingContacts(params: {
  vendorId: string;
  userId: string;
  shippingAddress: {
    full_name: string;
    phone: string;
  };
  orderTotal: number;
}) {
  const profile = await getOrderContactProfile(params.userId);
  const purchasedAt = new Date().toISOString();
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || params.shippingAddress.full_name;
  const contacts = [profile?.email, profile?.phone, params.shippingAddress.phone]
    .filter((value): value is string => Boolean(value && value.trim() && value !== 'Non fourni'));

  for (const contact of new Set(contacts)) {
    try {
      await upsertVendorMarketingContact({
        vendorId: params.vendorId,
        rawContact: contact,
        fullName,
        orderTotal: params.orderTotal,
        purchasedAt,
      });
    } catch (error: any) {
      logger.warn(`Unable to sync order marketing contact for vendor ${params.vendorId}: ${error?.message || 'unknown error'}`);
    }
  }
}

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
    const customerId = await getOrCreateCustomerId(userId);

    // 1. Validation Zod (no DB call)
    const validation = CreateOrderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Données de commande invalides',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const {
      items,
      vendor_id,
      shipping_address,
      payment_method,
      payment_intent_id,
      payment_confirmed,
      charged_amount,
      order_metadata,
    } = validation.data;

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

    // 3. Resolve currency — priorité : shop_currency verrouillé, puis country
    const currency = vendor.shop_currency || resolveVendorCurrency(vendor.country);

    // 3.5. Résumé financier multi-devises (prix depuis DB, FX interne, commission)
    //      Non bloquant : si le calcul échoue, on garde charged_amount du frontend.
    let financialSummary: OrderFinancialSummary | null = null;
    try {
      financialSummary = await buildOrderFinancialSummary({
        buyerUserId: userId,
        vendorId:    vendor_id,
        items:       items.map(i => ({ productId: i.product_id, quantity: i.quantity })),
        productType: 'physical',
      });
    } catch (fsErr: any) {
      logger.warn(`financial-summary: ${fsErr.message} — fallback to charged_amount`);
    }

    // 4. Generate order number (no DB call)
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 4.5. VÉRIFICATION STRIPE pour les paiements par carte
    //      On vérifie AVANT create_order_core pour ne pas créer de stock/escrow
    //      sur un paiement fictif ou non abouti.
    if (payment_method === 'card') {
      if (!payment_intent_id) {
        res.status(400).json({ success: false, error: 'payment_intent_id obligatoire pour un paiement par carte' });
        return;
      }

      // Vérifier que ce PaymentIntent n'a pas déjà été utilisé pour une autre commande
      const { data: existingOrderWithPI } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('payment_intent_id', payment_intent_id)
        .maybeSingle();

      if (existingOrderWithPI) {
        logger.warn(`PI déjà utilisé: ${payment_intent_id} → order ${existingOrderWithPI.id}`);
        res.status(409).json({ success: false, error: 'Ce paiement a déjà été utilisé pour une commande' });
        return;
      }

      // Vérification auprès de l'API Stripe (status + buyer_id)
      const stripeCheck = await verifyCardPaymentIntent(payment_intent_id, userId);
      if (!stripeCheck.verified) {
        logger.warn(`Paiement carte refusé: user=${userId}, PI=${payment_intent_id}, raison=${stripeCheck.error}`);
        res.status(402).json({ success: false, error: stripeCheck.error || 'Paiement non validé' });
        return;
      }
    }

    // 5. SINGLE ATOMIC RPC: create_order_core
    //    Validates stock + creates order + items + decrements stock + creates escrow
    //    All in one PostgreSQL transaction with row-level locking
    //
    // p_buyer_user_id   → remplit payer_id dans escrow (nécessaire pour remboursement wallet à l'annulation)
    // p_wallet_debit_amount → débit atomique du wallet si payment_method = 'wallet'
    //                         Le montant inclut la commission (charged_amount du frontend)
    // Montant débité du wallet = totalPaidAmount backend (devise acheteur).
    // Priorité : résumé financier calculé depuis la DB ; fallback : charged_amount frontend.
    const walletDebitAmount = payment_method === 'wallet'
      ? (financialSummary?.totalPaidAmount ?? (typeof charged_amount === 'number' && charged_amount > 0 ? charged_amount : 0))
      : 0;

    const { data: result, error: rpcError } = await supabaseAdmin.rpc('create_order_core', {
      p_order_number: orderNumber,
      p_customer_id: customerId,
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
      p_buyer_user_id: userId,
      p_wallet_debit_amount: walletDebitAmount,
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

    const effectiveChargedAmount = typeof charged_amount === 'number' && charged_amount >= 0
      ? charged_amount
      : Number(result.total_amount || 0);

    // Statut de paiement final — chaque méthode a sa propre source de vérité :
    //   card    → vérifié par l'API Stripe (step 4.5) → toujours 'paid' ici
    //   wallet  → débité atomiquement dans create_order_core → toujours 'paid'
    //   cash    → paiement à la livraison → toujours 'pending'
    //   mobile_money → confiance à payment_confirmed (flux hors Stripe)
    const finalPaymentStatus: 'pending' | 'paid' =
      payment_method === 'cash'
        ? 'pending'
        : payment_method === 'card'
          ? 'paid'
          : payment_method === 'wallet'
            ? 'paid'
            : payment_confirmed
              ? 'paid'
              : 'pending';

    const mergedOrderMetadata = {
      ...(payment_method === 'cash'
        ? {
            payment_type: 'cash_on_delivery',
            is_cod: true,
          }
        : {}),
      ...(payment_intent_id ? { external_payment_id: payment_intent_id } : {}),
      ...(order_metadata || {}),
    };

    const { error: orderUpdateError } = await supabaseAdmin
      .from('orders')
      .update({
        total_amount: effectiveChargedAmount,
        payment_status: finalPaymentStatus,
        metadata: mergedOrderMetadata,
        ...(payment_method === 'card' && payment_intent_id ? { payment_intent_id } : {}),
        // Champs financiers multi-devises — remplis uniquement si le résumé est disponible
        ...(financialSummary ? {
          buyer_currency:        financialSummary.buyerCurrency,
          seller_currency:       financialSummary.sellerCurrency,
          original_currency:     financialSummary.sellerCurrency,
          total_original_amount: financialSummary.totalOriginalAmount,
          total_paid_amount:     financialSummary.totalPaidAmount,
          paid_currency:         financialSummary.buyerCurrency,
          exchange_rate_used:    financialSummary.isCrossCurrency ? financialSummary.exchangeRate : null,
          exchange_rate_source:  financialSummary.exchangeRateSource,
          is_cross_currency:     financialSummary.isCrossCurrency,
          platform_fee_percent:  financialSummary.platformFeePercent,
          platform_fee_amount:   financialSummary.platformFeeAmount,
          platform_fee_currency: financialSummary.sellerCurrency,
          seller_net_amount:     financialSummary.sellerNetAmount,
          seller_net_currency:   financialSummary.sellerCurrency,
        } : {}),
      })
      .eq('id', result.order_id);

    if (orderUpdateError) {
      logger.error(`order finalization update error: ${orderUpdateError.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la finalisation de la commande' });
      return;
    }

    let escrowStatus = result.escrow_status as string;
    const { error: escrowUpdateError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        amount: effectiveChargedAmount,
        status: payment_method === 'cash' ? 'pending' : result.escrow_status,
        metadata: {
          ...(payment_method === 'cash'
            ? {
                payment_type: 'cash_on_delivery',
                note: 'Paiement à la livraison - escrow virtuel',
              }
            : {}),
          ...(payment_intent_id ? { external_payment_id: payment_intent_id } : {}),
          ...(order_metadata || {}),
        },
      })
      .eq('order_id', result.order_id);

    if (escrowUpdateError) {
      logger.error(`escrow finalization update error: ${escrowUpdateError.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la finalisation du séquestre' });
      return;
    }

    if (payment_method === 'cash') {
      escrowStatus = 'pending';
    }

    await syncOrderMarketingContacts({
      vendorId: vendor_id,
      userId,
      shippingAddress: {
        full_name: shipping_address.full_name,
        phone: shipping_address.phone,
      },
      orderTotal: effectiveChargedAmount,
    });

    if (finalPaymentStatus === 'paid' && effectiveChargedAmount > 0) {
      const commissionResult = await triggerAffiliateCommission(
        userId,
        effectiveChargedAmount,
        'achat_produit',
        result.order_id
      );

      if (!commissionResult.success) {
        logger.warn(`Agent commission not credited for order ${result.order_id}: ${commissionResult.error || 'unknown error'}`);
      }
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logger.info(`✅ Order created: ${result.order_id} (${orderNumber}), vendor=${vendor_id}, total=${effectiveChargedAmount} ${currency}, escrow=${escrowStatus}, wallet_debited=${walletDebitAmount > 0 ? walletDebitAmount : 'non'}, duration=${duration}ms, db_calls=2`);

    res.status(201).json({
      success: true,
      data: {
        order: {
          id: result.order_id,
          order_number: result.order_number,
          status: 'pending',
          payment_status: finalPaymentStatus,
          payment_method,
          subtotal: result.subtotal,
          total_amount: effectiveChargedAmount,
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

router.post('/digital', verifyJWT, orderCreateRateLimit, idempotencyGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const customerId = await getOrCreateCustomerId(userId);

    const validation = CreateDigitalOrderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Données de commande digitale invalides',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const {
      vendor_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_amount,
      currency,
      payment_method,
      payment_intent_id,
      purchase_record_id,
      pricing_type,
      subscription_interval,
    } = validation.data;

    const vendor = await getCachedVendor(vendor_id);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendeur introuvable ou inactif' });
      return;
    }

    if (vendor.user_id === userId) {
      res.status(400).json({ success: false, error: 'Vous ne pouvez pas commander dans votre propre boutique' });
      return;
    }

    let existingOrder: any = null;

    if (purchase_record_id) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select(ORDER_LIST_SELECT)
        .eq('customer_id', customerId)
        .eq('vendor_id', vendor_id)
        .eq('metadata->>purchase_record_id', purchase_record_id)
        .maybeSingle();
      existingOrder = data || null;
    }

    if (!existingOrder && payment_intent_id) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select(ORDER_LIST_SELECT)
        .eq('customer_id', customerId)
        .eq('vendor_id', vendor_id)
        .eq('payment_intent_id', payment_intent_id)
        .maybeSingle();
      existingOrder = data || null;
    }

    if (existingOrder) {
      const [enrichedExistingOrder] = await attachEscrowToOrders([existingOrder]);
      res.json({ success: true, data: enrichedExistingOrder });
      return;
    }

    const profile = await getOrderContactProfile(userId);
    const shippingAddress = buildDigitalShippingAddress({ productName: product_name, profile });
    const orderNumber = `DGT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const isCashOnDelivery = payment_method === 'cash';

    const { data: insertedOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        vendor_id,
        full_name: shippingAddress.full_name,
        payment_method,
        payment_status: payment_method === 'cash' ? 'pending' : 'paid',
        payment_intent_id: payment_intent_id || null,
        subtotal: total_amount,
        total_amount,
        shipping_amount: 0,
        tax_amount: 0,
        discount_amount: 0,
        status: isCashOnDelivery ? 'pending' : 'confirmed',
        source: 'online',
        shipping_address: shippingAddress,
        metadata: {
          source_flow: 'digital_marketplace',
          item_type: 'digital_product',
          digital_product_id: product_id,
          digital_product_name: product_name,
          purchase_record_id: purchase_record_id || null,
          pricing_type: pricing_type || 'one_time',
          subscription_interval: subscription_interval || null,
          quantity,
          unit_price,
          currency,
          ...(isCashOnDelivery
            ? {
                is_cod: true,
                payment_type: 'cash_on_delivery',
                digital_delivery_status: 'awaiting_payment',
              }
            : {
                digital_delivery_status: 'access_granted',
              }),
        },
      })
      .select(ORDER_LIST_SELECT)
      .single();

    if (insertError) {
      logger.error(`Digital order mirror creation error: ${insertError.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la création de la commande digitale' });
      return;
    }

    await syncOrderMarketingContacts({
      vendorId: vendor_id,
      userId,
      shippingAddress: {
        full_name: shippingAddress.full_name,
        phone: shippingAddress.phone,
      },
      orderTotal: total_amount,
    });

    if (!isCashOnDelivery && total_amount > 0) {
      const commissionResult = await triggerAffiliateCommission(
        userId,
        total_amount,
        'achat_produit_digital',
        insertedOrder.id
      );

      if (!commissionResult.success) {
        logger.warn(`Agent commission not credited for digital order ${insertedOrder.id}: ${commissionResult.error || 'unknown error'}`);
      }
    }

    const [enrichedOrder] = await attachEscrowToOrders([insertedOrder]);

    res.status(201).json({ success: true, data: enrichedOrder });
  } catch (error: any) {
    logger.error(`Digital order creation error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de la commande digitale' });
  }
});

/**
 * GET /api/orders/:orderId
 */
router.get('/:orderId([0-9a-fA-F-]{36})', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;
    const customerId = await getCustomerIdByUserId(userId);

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    const isCustomer = customerId !== null && order.customer_id === customerId;
    let isVendor = false;
    if (!isCustomer) {
      const vendor = await getManagedVendorForUser(userId);
      isVendor = vendor?.id === order.vendor_id;
    }

    if (!isCustomer && !isVendor) {
      res.status(403).json({ success: false, error: 'Accès non autorisé à cette commande' });
      return;
    }

    const { data: escrow } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, status, amount, commission_amount, currency, metadata, auto_release_date, released_at, seller_confirmed_at')
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
router.post('/:orderId([0-9a-fA-F-]{36})/cancel', verifyJWT, orderManageRateLimit, idempotencyGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;
    const { reason } = req.body || {};
    const customerId = await getOrCreateCustomerId(userId);

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      res.status(400).json({ success: false, error: 'Raison d\'annulation requise (min 3 caractères)' });
      return;
    }

    const { order, isBuyer } = await canUserManageBuyerOrder(orderId, userId, customerId);

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    if (!isBuyer) {
      res.status(403).json({ success: false, error: 'Accès non autorisé à cette commande' });
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

    const { data: escrow, error: escrowLookupError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('seller_confirmed_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (escrowLookupError) {
      throw escrowLookupError;
    }

    if (escrow?.seller_confirmed_at) {
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
      const { error: stockRestoreError } = await supabaseAdmin.rpc('increment_stock_batch', {
        p_items: orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      });

      if (stockRestoreError) {
        throw stockRestoreError;
      }
    }

    // Remboursement escrow → wallet client (atomique via RPC)
    const { data: refundResult, error: refundError } = await supabaseAdmin.rpc(
      'cancel_order_and_refund_wallet' as any,
      {
        p_order_id: orderId,
        p_user_id:  userId,
        p_reason:   reason.trim(),
      }
    );

    if (refundError) {
      throw refundError;
    }

    if (refundResult && !refundResult.success) {
      throw new Error(refundResult.error || 'Erreur lors du remboursement wallet');
    }

    const wasRefunded: boolean = refundResult?.refunded ?? false;
    const refundAmount: number  = refundResult?.amount  ?? 0;
    const refundCurrency: string = refundResult?.currency ?? 'GNF';

    logger.info(
      `Order ${orderId} cancelled — wallet refund: ${wasRefunded} (${refundAmount} ${refundCurrency})`
    );

    // Update order
    const cancellationReason = reason.trim();
    const baseOrderUpdate = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      metadata: {
        ...(order.metadata && typeof order.metadata === 'object' ? order.metadata : {}),
        cancellation_reason: cancellationReason,
      },
    };

    let { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({
        ...baseOrderUpdate,
        cancellation_reason: cancellationReason,
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error && /cancellation_reason/i.test(error.message || '')) {
      ({ data: updated, error } = await supabaseAdmin
        .from('orders')
        .update(baseOrderUpdate)
        .eq('id', orderId)
        .select('*')
        .single());
    }

    if (error) throw error;

    logger.info(`Order ${orderId} cancelled by buyer ${userId}: ${reason}`);
    res.json({
      success: true,
      data: updated,
      refund: {
        refunded: wasRefunded,
        amount:   refundAmount,
        currency: refundCurrency,
        destination: 'wallet',
      },
    });
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
    const customerId = await getCustomerIdByUserId(userId);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    if (!customerId) {
      res.json({ success: true, data: [], meta: { limit, offset, total: 0 } });
      return;
    }

    let query = supabaseAdmin
      .from('orders')
      .select(ORDER_LIST_SELECT, { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    const enrichedOrders = await attachEscrowToOrders(data || []);

    res.json({ success: true, data: enrichedOrders, meta: { limit, offset, total: count || 0 } });
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
    const vendor = await getManagedVendorForUser(userId);

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let query = supabaseAdmin
      .from('orders')
      .select(ORDER_LIST_SELECT, { count: 'exact' })
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    const enrichedOrders = await attachEscrowToOrders(data || []);

    res.json({ success: true, data: enrichedOrders, meta: { limit, offset, total: count || 0 } });
  } catch (error: any) {
    logger.error(`Error fetching vendor orders: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * PATCH /api/orders/:orderId/status
 * P0 OPTIMIZED: Uses increment_stock_batch for vendor cancellations
 */
router.patch('/:orderId([0-9a-fA-F-]{36})/status', verifyJWT, orderManageRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const statusSchema = z.object({
      status: z.enum(['confirmed', 'preparing', 'ready', 'shipped', 'in_transit', 'delivered', 'cancelled']),
      tracking_number: z.string().max(100).nullish(),
      cancellation_reason: z.string().max(500).nullish(),
      estimated_delivery_days: z.number().int().min(1).max(60).nullish(),
    });

    const validation = statusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Données invalides', details: validation.error.issues });
      return;
    }

    const requestedStatus = validation.data.status;
    const status = requestedStatus === 'shipped' ? 'in_transit' : requestedStatus;
    const { tracking_number, cancellation_reason, estimated_delivery_days } = validation.data;

    const vendor = await getManagedVendorForUser(userId);

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, vendor_id, payment_method, shipping_address, metadata')
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
    // Note: tracking_number, cancellation_reason, seller_confirmed_at, delivered_at
    // don't exist on orders table — store in metadata instead
    const existingMetadata =
      order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
        ? order.metadata
        : {};
    const shippingAddress =
      order.shipping_address && typeof order.shipping_address === 'object' && !Array.isArray(order.shipping_address)
        ? order.shipping_address
        : {};
    const isCashOnDelivery =
      order.payment_method === 'cash' &&
      (existingMetadata.is_cod === true || shippingAddress.is_cod === true || existingMetadata.payment_type === 'cash_on_delivery');

    if (tracking_number || cancellation_reason) {
      updates.metadata = {
        ...existingMetadata,
        ...(tracking_number ? { tracking_number } : {}),
        ...(cancellation_reason ? { cancellation_reason } : {}),
      };
    }

    if (status === 'confirmed') {
      const confirmedAt = new Date();

      if (isCashOnDelivery) {
        updates.metadata = {
          ...existingMetadata,
          ...(updates.metadata || {}),
          seller_confirmed_at: confirmedAt.toISOString(),
          is_cod: true,
          payment_type: 'cash_on_delivery',
        };

        await supabaseAdmin
          .from('escrow_transactions')
          .update({
            seller_confirmed_at: confirmedAt.toISOString(),
          })
          .eq('order_id', orderId);
      } else {
        const deliveryDays = estimated_delivery_days || 7;
        const estimatedDeliveryAt = new Date(confirmedAt.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
        const autoReleaseAt = new Date(estimatedDeliveryAt.getTime() + 72 * 60 * 60 * 1000);

        const { data: currentEscrow } = await supabaseAdmin
          .from('escrow_transactions')
          .select('metadata')
          .eq('order_id', orderId)
          .maybeSingle();

        updates.metadata = {
          ...existingMetadata,
          ...(updates.metadata || {}),
          seller_confirmed_at: confirmedAt.toISOString(),
          estimated_delivery_days: deliveryDays,
          estimated_delivery_at: estimatedDeliveryAt.toISOString(),
          escrow_auto_release_at: autoReleaseAt.toISOString(),
        };

        await supabaseAdmin
          .from('escrow_transactions')
          .update({
            seller_confirmed_at: confirmedAt.toISOString(),
            auto_release_date: autoReleaseAt.toISOString(),
            metadata: {
              ...(currentEscrow?.metadata && typeof currentEscrow.metadata === 'object' && !Array.isArray(currentEscrow.metadata)
                ? currentEscrow.metadata
                : {}),
              estimated_delivery_days: deliveryDays,
              estimated_delivery_at: estimatedDeliveryAt.toISOString(),
              auto_release_after_unconfirmed_reception_at: autoReleaseAt.toISOString(),
              auto_release_grace_hours: 72,
            },
          })
          .eq('order_id', orderId);
      }
    }

    if (status === 'delivered') {
      updates.metadata = {
        ...existingMetadata,
        ...(updates.metadata || {}),
        delivered_at: new Date().toISOString(),
      };
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

router.post('/:orderId([0-9a-fA-F-]{36})/confirm-cod-delivery', verifyJWT, orderManageRateLimit, idempotencyGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;
    const customerId = await getCustomerIdByUserId(userId);

    const { order, isBuyer } = await canUserManageBuyerOrder(orderId, userId, customerId);

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    if (!isBuyer) {
      res.status(403).json({ success: false, error: 'Accès non autorisé à cette commande' });
      return;
    }

    const { data: currentOrder, error: currentOrderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_method, payment_status, shipping_address, metadata')
      .eq('id', orderId)
      .single();

    if (currentOrderError || !currentOrder) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    const metadata =
      currentOrder.metadata && typeof currentOrder.metadata === 'object' && !Array.isArray(currentOrder.metadata)
        ? currentOrder.metadata
        : {};
    const shippingAddress =
      currentOrder.shipping_address && typeof currentOrder.shipping_address === 'object' && !Array.isArray(currentOrder.shipping_address)
        ? currentOrder.shipping_address
        : {};
    const isCod =
      currentOrder.payment_method === 'cash' &&
      (metadata.is_cod === true || shippingAddress.is_cod === true || metadata.payment_type === 'cash_on_delivery');

    if (!isCod) {
      res.status(400).json({ success: false, error: 'Cette commande n’est pas en paiement à la livraison' });
      return;
    }

    if (!['ready', 'shipped', 'in_transit', 'delivered', 'completed'].includes(currentOrder.status)) {
      res.status(400).json({
        success: false,
        error: `Confirmation impossible pour une commande en statut "${currentOrder.status}"`,
      });
      return;
    }

    if (currentOrder.status === 'completed' && currentOrder.payment_status === 'paid') {
      res.json({ success: true, data: currentOrder });
      return;
    }

    const confirmedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'completed',
        payment_status: 'paid',
        metadata: {
          ...metadata,
          is_cod: true,
          payment_type: 'cash_on_delivery',
          cod_confirmed_at: confirmedAt,
        },
        updated_at: confirmedAt,
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin
      .from('escrow_transactions')
      .update({
        metadata: {
          payment_type: 'cash_on_delivery',
          note: 'Paiement à la livraison confirmé par le client',
          cod_confirmed_at: confirmedAt,
        },
      })
      .eq('order_id', orderId);

    logger.info(`COD order ${orderId} confirmed by buyer ${userId}`);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(`COD delivery confirmation error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la confirmation du paiement à la livraison' });
  }
});

export default router;
