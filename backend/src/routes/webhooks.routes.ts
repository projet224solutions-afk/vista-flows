/**
 * 🔔 WEBHOOK HANDLERS - Backend Node.js centralisé
 *
 * Webhooks gérés côté Node.js :
 *   - Stripe  : /webhooks/stripe  (signature + idempotency + ordre/escrow/wallet)
 *   - Djomy   : /webhooks/djomy   (HMAC-SHA256 + trust score + auto-release fonds vendeur)
 *
 * Migration :
 *   - stripe-webhook        (Edge Function) : Node.js est la version canonique
 *   - djomy-secure-webhook  (Edge Function) : Node.js est la version canonique
 *   - djomy-webhook         (Edge Function) : couvert par /webhooks/djomy
 *   - chapchappay-webhook   (Edge Function) : Node.js est la version canonique
 *   - paypal-webhook        (Edge Function) : Node.js est la version canonique
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { auditTrail } from '../services/auditTrail.service.js';
import { triggerAffiliateCommission } from '../services/commission.service.js';
import { webhookRateLimit } from '../middlewares/routeRateLimiter.js';
import { verifyDjomyTransaction } from '../services/djomy.service.js';

const router = Router();

// Instance Stripe utilisée uniquement pour la vérification de signature webhook
// (aucun appel réseau supplémentaire — constructEvent est 100% local)
const stripeWebhook: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as any })
  : null;

// ==================== WEBHOOK EVENT JOURNAL ====================

async function journalEvent(
  webhookId: string,
  eventType: string,
  payload: any,
  status: 'received' | 'processing' | 'completed' | 'failed' | 'skipped',
  errorMessage?: string
): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('webhook_events')
      .upsert({
        webhook_id: webhookId,
        provider: 'stripe',
        event_type: eventType,
        payload,
        processing_status: status,
        processed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider,webhook_id' })
      .select('id')
      .single();

    return data?.id || null;
  } catch (err: any) {
    logger.error(`Webhook journal error: ${err.message}`);
    return null;
  }
}

async function isAlreadyProcessed(webhookId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('webhook_events')
    .select('processing_status')
    .eq('provider', 'stripe')
    .eq('webhook_id', webhookId)
    .maybeSingle();

  return data?.processing_status === 'completed';
}

// ==================== EVENT HANDLERS ====================

// Zero-decimal currencies that Stripe sends without ×100
const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF',
  'UGX','VND','VUV','XAF','XOF','XPF',
]);

function stripeAmountToReal(stripeAmount: number, currency: string): number {
  return STRIPE_ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
    ? stripeAmount
    : stripeAmount / 100;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function triggerOrderAgentCommission(
  orderId: string,
  fallbackUserId?: string,
  fallbackAmount?: number
): Promise<void> {
  if (!UUID_RE.test(orderId)) {
    logger.warn(`Skipping agent commission for non-UUID order id: ${orderId}`);
    return;
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, customer_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    logger.warn(`Unable to load order ${orderId} for agent commission: ${orderError.message}`);
  }

  let buyerUserId = fallbackUserId || null;
  if (order?.customer_id) {
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('user_id')
      .eq('id', order.customer_id)
      .maybeSingle();

    if (customerError) {
      logger.warn(`Unable to load customer ${order.customer_id} for agent commission: ${customerError.message}`);
    } else if (customer?.user_id) {
      buyerUserId = customer.user_id;
    }
  }

  const amount = Number(order?.total_amount ?? fallbackAmount ?? 0);
  if (!buyerUserId || amount <= 0) {
    logger.warn(`Skipping agent commission for order ${orderId}: missing buyer or amount`);
    return;
  }

  const commissionResult = await triggerAffiliateCommission(
    buyerUserId,
    amount,
    'achat_produit',
    orderId
  );

  if (!commissionResult.success) {
    logger.warn(`Agent commission not credited for webhook order ${orderId}: ${commissionResult.error || 'unknown error'}`);
  }
}

async function handlePaymentIntentSucceeded(event: any): Promise<void> {
  const paymentIntent = event.data.object;
  let orderId = paymentIntent.metadata?.order_id;
  const userId = paymentIntent.metadata?.user_id;

  // Vérifier que le PaymentIntent est bien en statut succeeded (double contrôle)
  if (paymentIntent.status !== 'succeeded') {
    logger.warn(`Webhook: payment_intent.succeeded reçu mais status=${paymentIntent.status} — ignoré`);
    return;
  }

  logger.info(`Webhook: payment_intent.succeeded — PI=${paymentIntent.id}, order=${orderId}`);

  // If no order_id in metadata, try to find the order by payment_intent_id
  // (marketplace-escrow flow creates the order AFTER the PaymentIntent)
  if (!orderId) {
    const { data: matchedOrder } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount')
      .eq('payment_intent_id', paymentIntent.id)
      .maybeSingle();
    if (matchedOrder) {
      orderId = matchedOrder.id;
      logger.info(`Webhook: resolved order by payment_intent_id — order=${orderId}`);
    }
  }

  if (orderId) {
    // Valider que le montant réellement payé correspond au montant attendu
    const currency = (paymentIntent.currency || 'gnf').toUpperCase();
    const amountPaid = stripeAmountToReal(paymentIntent.amount_received ?? paymentIntent.amount, currency);
    const expectedMeta = Number(paymentIntent.metadata?.total_amount || 0);

    if (expectedMeta > 0) {
      const diff = Math.abs(amountPaid - expectedMeta);
      const tolerance = Math.max(1, expectedMeta * 0.001); // 0.1% tolérance arrondi
      if (diff > tolerance) {
        logger.error(
          `Webhook: montant mismatch PI=${paymentIntent.id} — payé=${amountPaid}, attendu=${expectedMeta}`
        );
        await auditTrail.log({
          actorId: 'stripe',
          actorType: 'webhook',
          action: 'payment.amount_mismatch',
          resourceType: 'payment_intent',
          resourceId: paymentIntent.id,
          metadata: { amountPaid, expectedMeta, orderId },
          riskLevel: 'critical',
        });
        // Bloquer la confirmation de paiement — ne pas marquer comme payé
        return;
      }
    }

    // Update order payment status
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Update escrow to confirmed (try both order_id and stripe_payment_intent_id)
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ payment_confirmed: true, updated_at: new Date().toISOString() })
      .eq('order_id', orderId);

    await triggerOrderAgentCommission(
      orderId,
      userId,
      stripeAmountToReal(paymentIntent.amount, currency)
    );
  }

  // Also confirm escrow by stripe_payment_intent_id (for marketplace-escrow flow)
  await supabaseAdmin
    .from('escrow_transactions')
    .update({ payment_confirmed: true, updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Record in stripe_payments if exists
  await supabaseAdmin
    .from('stripe_payments')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_intent_id', paymentIntent.id);

  // Update stripe_transactions status
  await supabaseAdmin
    .from('stripe_transactions')
    .update({ status: 'SUCCEEDED', updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Credit wallet deposits through the idempotent DB function.
  // The frontend also confirms deposits, so both paths must converge here.
  if (
    (paymentIntent.metadata?.type === 'wallet_deposit' ||
      paymentIntent.metadata?.type === 'deposit' ||
      paymentIntent.metadata?.source === 'wallet_deposit') &&
    userId
  ) {
    const currency = paymentIntent.currency?.toUpperCase() || 'GNF';
    const grossAmount = Number(
      paymentIntent.metadata?.gross_amount || stripeAmountToReal(paymentIntent.amount, currency)
    );
    const feeRate = Number(paymentIntent.metadata?.fee_rate || 0);
    const depositFee = Number(paymentIntent.metadata?.deposit_fee || 0);
    const netAmount = Number(paymentIntent.metadata?.net_amount || Math.max(grossAmount - depositFee, 0));

    const { data: existingTx } = await supabaseAdmin
      .from('stripe_transactions')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    let transactionId = existingTx?.id;

    if (!transactionId) {
      const { data: createdTx, error: createTxError } = await supabaseAdmin
        .from('stripe_transactions')
        .insert({
          stripe_payment_intent_id: paymentIntent.id,
          payment_intent_id: paymentIntent.id,
          buyer_id: userId,
          seller_id: userId,
          amount: grossAmount,
          currency,
          commission_rate: feeRate,
          commission_amount: depositFee,
          seller_net_amount: netAmount,
          status: 'SUCCEEDED',
          payment_method: 'card',
          metadata: {
            type: 'wallet_deposit',
            source: 'wallet_deposit',
            recovered_from_webhook: true,
          },
        })
        .select('id')
        .single();

      if (createTxError || !createdTx) {
        logger.warn(`Wallet deposit transaction creation failed: ${createTxError?.message || 'no transaction'}`);
      } else {
        transactionId = createdTx.id;
      }
    } else {
      await supabaseAdmin
        .from('stripe_transactions')
        .update({
          status: 'SUCCEEDED',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);
    }

    if (transactionId) {
      const { error: depositError } = await supabaseAdmin.rpc('process_deposit_payment', {
        p_transaction_id: transactionId,
      });

      if (depositError) {
        logger.warn(`Wallet deposit processing failed: ${depositError.message}`);
      } else {
        logger.info(`Wallet deposit processed: user=${userId}, net=${netAmount} ${currency}`);
      }
    }
  }

  await auditTrail.log({
    actorId: userId || 'stripe',
    actorType: 'webhook',
    action: 'payment.succeeded',
    resourceType: 'payment_intent',
    resourceId: paymentIntent.id,
    metadata: { orderId, amount: paymentIntent.amount },
    riskLevel: 'medium',
  });
}

async function handlePaymentIntentFailed(event: any): Promise<void> {
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.order_id;

  logger.warn(`Webhook: payment_intent.payment_failed — PI=${paymentIntent.id}, order=${orderId}`);

  if (orderId) {
    await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderId);
  }

  await supabaseAdmin
    .from('stripe_payments')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('payment_intent_id', paymentIntent.id);

  await auditTrail.log({
    actorId: 'stripe',
    actorType: 'webhook',
    action: 'payment.failed',
    resourceType: 'payment_intent',
    resourceId: paymentIntent.id,
    metadata: { orderId, error: paymentIntent.last_payment_error?.message },
    riskLevel: 'high',
  });
}

async function handleChargeRefunded(event: any): Promise<void> {
  const charge = event.data.object;
  const paymentIntentId = charge.payment_intent;
  // Utiliser stripeAmountToReal pour respecter les devises zéro-décimal (GNF, XOF…)
  const currency = (charge.currency || 'usd').toUpperCase();
  const refundAmount = stripeAmountToReal(charge.amount_refunded, currency);
  const isPartial = charge.amount_refunded < charge.amount;

  logger.info(`Webhook: charge.refunded — PI=${paymentIntentId}, amount=${refundAmount}, partial=${isPartial}`);

  // Find associated order
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, vendor_id, customer_id')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (order) {
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: isPartial ? 'partially_refunded' : 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Update escrow
    await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: isPartial ? 'partially_refunded' : 'refunded',
        released_at: new Date().toISOString(),
      })
      .eq('order_id', order.id);
  }

  await auditTrail.log({
    actorId: 'stripe',
    actorType: 'webhook',
    action: isPartial ? 'payment.partially_refunded' : 'payment.refunded',
    resourceType: 'charge',
    resourceId: charge.id,
    metadata: { paymentIntentId, refundAmount, isPartial },
    riskLevel: 'high',
  });
}

async function handleCheckoutSessionExpired(event: any): Promise<void> {
  const session = event.data.object;
  const orderId = session.metadata?.order_id;

  logger.warn(`Webhook: checkout.session.expired — session=${session.id}, order=${orderId}`);

  if (orderId) {
    await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'expired', status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending');

    // Restore stock
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (items) {
      for (const item of items) {
        await supabaseAdmin.rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }
    }

    // Refund escrow
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'refunded', released_at: new Date().toISOString() })
      .eq('order_id', orderId);
  }
}

// ─────────────────────────────────────────────────────────
// STRIPE WEBHOOK HANDLER (inchangé)
// ─────────────────────────────────────────────────────────

/**
 * POST /webhooks/stripe
 *
 * IMPORTANT: This route must receive RAW body (not parsed JSON).
 * Configure express.raw() for this route in server.ts.
 */
router.post('/stripe', webhookRateLimit, async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('CRITIQUE: STRIPE_WEBHOOK_SECRET non configuré');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  if (!stripeWebhook) {
    logger.error('CRITIQUE: STRIPE_SECRET_KEY non configuré');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  // Récupérer le body brut — express.raw() livre un Buffer
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

  // Vérification signature + parsing JSON via SDK officiel Stripe
  // constructEvent gère : HMAC-SHA256, anti-replay 5min, rotation de secrets (multi-v1)
  let event: any;
  try {
    event = stripeWebhook.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    logger.warn(`Stripe webhook: signature invalide — ${err.message}`);
    await auditTrail.log({
      actorId: 'stripe',
      actorType: 'webhook',
      action: 'webhook.signature_invalid',
      resourceType: 'webhook',
      resourceId: 'unknown',
      ip: req.ip || undefined,
      riskLevel: 'critical',
    });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const webhookId = event.id;
  const eventType = event.type;

  // Idempotency: skip if already processed
  if (await isAlreadyProcessed(webhookId)) {
    logger.info(`Webhook already processed: ${webhookId}`);
    res.json({ received: true, status: 'already_processed' });
    return;
  }

  // Journal: mark as processing
  await journalEvent(webhookId, eventType, event, 'processing');

  try {
    // Route to handler
    switch (eventType) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event);
        break;
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event);
        break;
      default:
        logger.info(`Webhook: unhandled event type "${eventType}"`);
        await journalEvent(webhookId, eventType, event, 'skipped');
        res.json({ received: true, status: 'skipped' });
        return;
    }

    // Journal: mark as completed
    await journalEvent(webhookId, eventType, event, 'completed');
    logger.info(`Webhook processed: ${eventType} (${webhookId})`);
    res.json({ received: true, status: 'processed' });
  } catch (err: any) {
    logger.error(`Webhook processing error: ${err.message}`, { webhookId, eventType });
    await journalEvent(webhookId, eventType, event, 'failed', err.message);

    // Update retry count
    await supabaseAdmin
      .from('webhook_events')
      .update({ retry_count: 1 }) // Stripe will retry
      .eq('webhook_id', webhookId)
      .eq('provider', 'stripe');

    res.status(500).json({ error: 'Processing failed' });
  }
});

// ─────────────────────────────────────────────────────────
// DJOMY WEBHOOK HELPERS
// ─────────────────────────────────────────────────────────

const DJOMY_STATUS_MAP: Record<string, string> = {
  'payment.created':    'PROCESSING',
  'payment.redirected': 'PROCESSING',
  'payment.pending':    'PROCESSING',
  'payment.success':    'SUCCESS',
  'payment.failed':     'FAILED',
  'payment.cancelled':  'CANCELLED',
};

function verifyDjomySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts = signatureHeader.split(':');
  if (parts.length !== 2 || parts[0] !== 'v1') return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return computed === parts[1];
}

interface TrustScoreResult {
  totalScore: number;
  breakdown: Record<string, { score: number; maxScore: number; details: string }>;
  decision: 'AUTO_RELEASE' | 'BLOCKED' | 'MANUAL_REVIEW';
  autoReleased: boolean;
}

async function calculateDjomyTrustScore(
  tx: Record<string, any>,
  djomyVerification: { verified: boolean; status: string; data: unknown }
): Promise<TrustScoreResult> {
  const { data: configs } = await supabaseAdmin
    .from('trust_score_config')
    .select('config_key, config_value');

  const config: Record<string, number> = {};
  for (const c of (configs || []) as { config_key: string; config_value: number }[]) {
    config[c.config_key] = Number(c.config_value);
  }

  const threshold     = config.auto_release_threshold     || 70;
  const maxAutoAmount = config.max_auto_release_amount    || 5_000_000;
  const weights = {
    djomy:              config.weight_djomy_confirmed    || 25,
    userAge:            config.weight_user_age           || 15,
    phoneHistory:       config.weight_phone_history      || 15,
    vendorKyc:          config.weight_vendor_kyc         || 20,
    transactionAmount:  config.weight_transaction_amount || 15,
    noDisputes:         config.weight_no_disputes        || 10,
  };

  const breakdown: TrustScoreResult['breakdown'] = {};
  let totalScore = 0;
  const amount = Number(tx.amount) || 0;
  const djomyConfirmed = djomyVerification.verified && djomyVerification.status === 'SUCCESS';

  // 1. Djomy API confirmation
  breakdown.djomy_confirmed = {
    score: djomyConfirmed ? weights.djomy : 0,
    maxScore: weights.djomy,
    details: djomyConfirmed ? 'Transaction confirmée par API Djomy' : 'Transaction non confirmée par API',
  };
  totalScore += breakdown.djomy_confirmed.score;

  // 2. User account age
  if (tx.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('created_at').eq('id', tx.user_id).single();
    if (profile) {
      const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000);
      const s = ageDays > 365 ? 1 : ageDays > 180 ? 0.8 : ageDays > 90 ? 0.6 : ageDays > 30 ? 0.4 : ageDays > 7 ? 0.2 : 0;
      breakdown.user_age = { score: Math.round(weights.userAge * s), maxScore: weights.userAge, details: `Compte créé il y a ${ageDays} jours` };
    } else {
      breakdown.user_age = { score: 0, maxScore: weights.userAge, details: 'Profil introuvable' };
    }
  } else {
    breakdown.user_age = { score: 0, maxScore: weights.userAge, details: 'Utilisateur non identifié' };
  }
  totalScore += breakdown.user_age.score;

  // 3. Phone history
  const payerPhone = String(tx.payer_phone || '');
  const { data: phoneData } = await supabaseAdmin
    .from('phone_history').select('is_blacklisted, fraud_reports, usage_count, success_count')
    .eq('phone_number', payerPhone).maybeSingle();

  if (phoneData) {
    if (phoneData.is_blacklisted || phoneData.fraud_reports > 0) {
      breakdown.phone_history = { score: 0, maxScore: weights.phoneHistory, details: phoneData.is_blacklisted ? 'Téléphone blacklisté' : `${phoneData.fraud_reports} signalement(s) de fraude` };
    } else {
      const successRate = phoneData.usage_count > 0 ? phoneData.success_count / phoneData.usage_count : 0;
      const s = Math.round(weights.phoneHistory * Math.min(successRate, 1) * (phoneData.usage_count >= 3 ? 1 : 0.5));
      breakdown.phone_history = { score: s, maxScore: weights.phoneHistory, details: `${phoneData.usage_count} transactions, ${Math.round(successRate * 100)}% réussite` };
    }
  } else {
    breakdown.phone_history = { score: Math.round(weights.phoneHistory * 0.3), maxScore: weights.phoneHistory, details: 'Nouveau numéro de téléphone' };
  }
  totalScore += breakdown.phone_history.score;

  // 4. Vendor KYC
  let disputeCount = 0;
  if (tx.vendor_id) {
    const { data: vendor } = await supabaseAdmin
      .from('vendors').select('kyc_status, is_verified, dispute_count').eq('id', tx.vendor_id).single();
    if (vendor) {
      const kycScore = (vendor.kyc_status === 'verified' || vendor.is_verified) ? weights.vendorKyc : vendor.kyc_status === 'pending' ? weights.vendorKyc * 0.3 : 0;
      breakdown.vendor_kyc = { score: Math.round(kycScore), maxScore: weights.vendorKyc, details: `KYC: ${vendor.kyc_status || 'pending'}, Vérifié: ${vendor.is_verified}` };
      disputeCount = vendor.dispute_count || 0;
    } else {
      breakdown.vendor_kyc = { score: 0, maxScore: weights.vendorKyc, details: 'Vendeur introuvable' };
    }
  } else {
    breakdown.vendor_kyc = { score: Math.round(weights.vendorKyc * 0.5), maxScore: weights.vendorKyc, details: 'Pas de vendeur (paiement direct)' };
  }
  totalScore += breakdown.vendor_kyc.score;

  // 5. Transaction amount
  const amtRatio = amount / maxAutoAmount;
  const amtScore = amount > maxAutoAmount ? 0 : amtRatio > 0.5 ? weights.transactionAmount * 0.5 : amtRatio > 0.2 ? weights.transactionAmount * 0.8 : weights.transactionAmount;
  breakdown.transaction_amount = { score: Math.round(amtScore), maxScore: weights.transactionAmount, details: `Montant: ${amount.toLocaleString()} GNF (max auto: ${maxAutoAmount.toLocaleString()} GNF)` };
  totalScore += breakdown.transaction_amount.score;

  // 6. No disputes
  const disputeScore = Math.max(0, weights.noDisputes - disputeCount * 2);
  breakdown.no_disputes = { score: Math.round(disputeScore), maxScore: weights.noDisputes, details: `${disputeCount} litige(s) enregistré(s)` };
  totalScore += breakdown.no_disputes.score;

  let decision: TrustScoreResult['decision'];
  const autoReleased = totalScore >= threshold && amount <= maxAutoAmount && djomyConfirmed;
  if (autoReleased) {
    decision = 'AUTO_RELEASE';
  } else if (totalScore < threshold * 0.5) {
    decision = 'BLOCKED';
  } else {
    decision = 'MANUAL_REVIEW';
  }

  return { totalScore, breakdown, decision, autoReleased };
}

// ─────────────────────────────────────────────────────────
// DJOMY WEBHOOK HANDLER
// ─────────────────────────────────────────────────────────

/**
 * POST /webhooks/djomy
 *
 * IMPORTANT: This route must receive RAW body (not parsed JSON).
 * Configure express.raw() for this route in server.ts.
 */
router.post('/djomy', webhookRateLimit, async (req: Request, res: Response) => {
  const clientSecret = process.env.DJOMY_CLIENT_SECRET?.trim();
  const signatureHeader = req.headers['x-webhook-signature'] as string | undefined;
  const sourceIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

  // Signature verification
  let signatureValid = false;
  if (signatureHeader && clientSecret) {
    signatureValid = verifyDjomySignature(rawBody, signatureHeader, clientSecret);
    if (!signatureValid) {
      logger.warn('Djomy webhook: signature invalide — rejet');
      void supabaseAdmin.from('djomy_webhook_logs').insert({
        event_type: 'SIGNATURE_INVALID',
        payload: { raw: rawBody.substring(0, 500) },
        signature_valid: false,
        ip_address: sourceIp,
        error_message: 'Invalid webhook signature',
      });
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { eventType, eventId, data } = payload;
  logger.info(`Djomy webhook: ${eventType}`, { eventId, transactionId: data?.transactionId });

  // Idempotency: skip if already processed
  if (eventId) {
    const { data: existing } = await supabaseAdmin
      .from('djomy_webhook_logs')
      .select('id, processed')
      .eq('event_id', eventId)
      .maybeSingle();
    if (existing?.processed) {
      logger.info(`Djomy webhook already processed: ${eventId}`);
      res.json({ success: true, message: 'Already processed' });
      return;
    }
  }

  // Log webhook
  const { data: webhookLog } = await supabaseAdmin
    .from('djomy_webhook_logs')
    .insert({ event_id: eventId, event_type: eventType, transaction_id: data?.transactionId, payload, signature_valid: signatureValid, ip_address: sourceIp, processed: false })
    .select().single();

  try {
    const internalStatus = DJOMY_STATUS_MAP[eventType] || 'PROCESSING';

    // Find transaction
    let tx: any = null;
    if (data?.transactionId) {
      const { data: byDjomyId } = await supabaseAdmin
        .from('djomy_transactions').select('*').eq('djomy_transaction_id', data.transactionId).single();
      tx = byDjomyId;
      if (!tx && data.merchantPaymentReference) {
        const { data: byOrderId } = await supabaseAdmin
          .from('djomy_transactions').select('*').eq('order_id', data.merchantPaymentReference).single();
        tx = byOrderId;
      }
    }

    if (tx) {
      // Update transaction
      const updateFields: Record<string, any> = {
        status: internalStatus,
        djomy_response: payload,
        updated_at: new Date().toISOString(),
      };
      if (data?.paidAmount) updateFields.received_amount = data.paidAmount;
      if (data?.fees) updateFields.fees = data.fees;
      if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(internalStatus)) {
        updateFields.completed_at = new Date().toISOString();
      }
      await supabaseAdmin.from('djomy_transactions').update(updateFields).eq('id', tx.id);

      // Also sync djomy_payments table if exists (best effort)
      if (data?.transactionId) {
        void supabaseAdmin.from('djomy_payments').update({
          status: internalStatus.toLowerCase(),
          paid_amount: data.paidAmount,
          received_amount: data.receivedAmount,
          fees: data.fees,
          webhook_event_id: eventId,
          webhook_received_at: new Date().toISOString(),
          response_data: payload,
          updated_at: new Date().toISOString(),
        }).eq('transaction_id', data.transactionId);
      }

      if (eventType === 'payment.success') {
        // Secondary API verification
        const clientId = process.env.DJOMY_CLIENT_ID?.trim();
        let djomyVerification: { verified: boolean; status: string; data: unknown };
        if (clientId && clientSecret) {
          djomyVerification = await verifyDjomyTransaction(data.transactionId);
        } else {
          djomyVerification = { verified: true, status: 'SUCCESS', data: null };
        }

        // Trust score
        const trustResult = await calculateDjomyTrustScore(tx, djomyVerification);

        void supabaseAdmin.from('trust_score_logs').insert({
          transaction_id: tx.id,
          vendor_id: tx.vendor_id,
          user_id: tx.user_id,
          total_score: trustResult.totalScore,
          threshold_used: 70,
          auto_released: trustResult.autoReleased,
          score_breakdown: trustResult.breakdown,
          djomy_verification_result: djomyVerification,
          decision: trustResult.decision,
        });

        // Update phone history (success, best effort)
        void supabaseAdmin.rpc('update_phone_history', {
          p_phone: tx.payer_phone || '',
          p_user_id: tx.user_id,
          p_success: true,
        });

        const paidAmount = Number(data.paidAmount || tx.amount);
        const fees = Number(data.fees || paidAmount * 0.02);
        const receivedAmount = paidAmount - fees;

        if (tx.vendor_id) {
          const { data: blockedFund } = await supabaseAdmin
            .from('vendor_blocked_funds')
            .insert({
              vendor_id: tx.vendor_id,
              transaction_id: tx.id,
              amount: receivedAmount,
              original_amount: paidAmount,
              fees,
              currency: 'GNF',
              status: trustResult.autoReleased ? 'RELEASED' : 'BLOCKED',
              trust_score: trustResult.totalScore,
              auto_released: trustResult.autoReleased,
              release_type: trustResult.autoReleased ? 'AUTO_RELEASE' : null,
              released_at: trustResult.autoReleased ? new Date().toISOString() : null,
            })
            .select().single();

          if (trustResult.autoReleased) {
            logger.info(`Djomy: auto-release fonds vendeur ${tx.vendor_id}, montant=${receivedAmount}, score=${trustResult.totalScore}`);
            const { data: vendor } = await supabaseAdmin.from('vendors').select('user_id').eq('id', tx.vendor_id).single();
            if (vendor?.user_id) {
              const { data: wallet } = await supabaseAdmin.from('wallets').select('id, balance').eq('user_id', vendor.user_id).single();
              if (wallet) {
                await supabaseAdmin.from('wallets').update({ balance: Number(wallet.balance) + receivedAmount, updated_at: new Date().toISOString() }).eq('id', wallet.id);
                void supabaseAdmin.from('wallet_transactions').insert({ wallet_id: wallet.id, amount: receivedAmount, type: 'credit', description: `Paiement auto-libéré (score: ${trustResult.totalScore}) - ${tx.order_id}`, reference_id: tx.id });
              }
            }
            void supabaseAdmin.from('admin_action_logs').insert({
              admin_id: '00000000-0000-0000-0000-000000000000',
              action_type: 'AUTO_RELEASE_FUNDS',
              target_type: 'vendor_blocked_funds',
              target_id: blockedFund?.id || tx.id,
              reason: `Score de confiance: ${trustResult.totalScore}/100 >= seuil (auto-release)`,
              new_value: { amount: receivedAmount, trust_score: trustResult.totalScore, breakdown: trustResult.breakdown, djomy_verification: djomyVerification.status },
            });
          } else {
            logger.warn(`Djomy: fonds BLOQUÉS pour vendeur ${tx.vendor_id}, décision=${trustResult.decision}, score=${trustResult.totalScore}`);
            void supabaseAdmin.rpc('create_admin_notification', {
              p_type: 'PAYMENT_REVIEW_REQUIRED',
              p_title: 'Paiement nécessitant révision manuelle',
              p_message: `Transaction ${tx.order_id} de ${paidAmount.toLocaleString()} GNF bloquée. Score: ${trustResult.totalScore}/100. Décision: ${trustResult.decision}`,
              p_priority: trustResult.totalScore < 35 ? 'high' : 'medium',
              p_entity_type: 'djomy_transaction',
              p_entity_id: tx.id,
              p_metadata: { vendor_id: tx.vendor_id, amount: paidAmount, received_amount: receivedAmount, trust_score: trustResult.totalScore, decision: trustResult.decision, breakdown: trustResult.breakdown },
            });
          }
        } else if (tx.user_id) {
          // Paiement direct — créditer le wallet utilisateur
          const { data: wallet } = await supabaseAdmin.from('wallets').select('id, balance').eq('user_id', tx.user_id).single();
          if (wallet) {
            void supabaseAdmin.from('wallet_transactions').insert({
              wallet_id: wallet.id,
              user_id: tx.user_id,
              type: 'deposit',
              amount: receivedAmount,
              description: `Recharge via ${data.paymentMethod || 'Mobile Money'}`,
              status: 'completed',
              reference: tx.id,
            });
          }
        }

        // Update order
        if (tx.order_id) {
          await supabaseAdmin.from('orders').update({ payment_status: 'paid', updated_at: new Date().toISOString() }).eq('id', tx.order_id);
        }

      } else if (eventType === 'payment.failed' || eventType === 'payment.cancelled') {
        void supabaseAdmin.rpc('update_phone_history', {
          p_phone: tx.payer_phone || '',
          p_user_id: tx.user_id,
          p_success: false,
        });
        if (tx.order_id) {
          await supabaseAdmin.from('orders').update({ payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', tx.order_id);
        }
      }
    } else if (data?.transactionId) {
      logger.warn(`Djomy webhook: transaction introuvable pour djomyId=${data.transactionId}`);
    }

    // Mark as processed
    await supabaseAdmin.from('djomy_webhook_logs').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', webhookLog?.id);

    logger.info(`Djomy webhook traité: ${eventType}`, { eventId, txId: tx?.id });
    res.json({ success: true, message: 'Webhook processed' });

  } catch (err: any) {
    logger.error(`Djomy webhook error: ${err.message}`, { eventId, eventType });
    void supabaseAdmin.from('djomy_webhook_logs').update({ processed: true, processed_at: new Date().toISOString(), error_message: err.message }).eq('id', webhookLog?.id);
    res.json({ success: false, error: err.message }); // 200 pour éviter les re-livraisons Djomy
  }
});

// ─────────────────────────────────────────────────────────
// PAYPAL WEBHOOK HELPERS + HANDLER
// ─────────────────────────────────────────────────────────

// Cache token PayPal en mémoire (évite un appel OAuth par webhook)
let _paypalTokenCache: { token: string; expiresAt: number } | null = null;

async function getPayPalAccessToken(): Promise<string> {
  if (_paypalTokenCache && _paypalTokenCache.expiresAt > Date.now()) {
    return _paypalTokenCache.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET_KEY;
  if (!clientId || !secret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_SECRET_KEY non configurés');

  const isSandbox = process.env.PAYPAL_SANDBOX === 'true';
  const base = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  const resp = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`PayPal OAuth failed: ${resp.status} ${err}`);
  }

  const { access_token, expires_in } = await resp.json();
  _paypalTokenCache = { token: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

async function verifyPayPalWebhookSignature(
  req: Request,
  rawBody: string,
  webhookId: string,
  event: any,
): Promise<{ valid: boolean; error?: string }> {
  const transmissionId   = req.headers['paypal-transmission-id']   as string;
  const transmissionTime = req.headers['paypal-transmission-time'] as string;
  const transmissionSig  = req.headers['paypal-transmission-sig']  as string;
  const certUrl          = req.headers['paypal-cert-url']          as string;
  const authAlgo         = req.headers['paypal-auth-algo']         as string;

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return { valid: false, error: 'Missing PayPal webhook headers' };
  }

  // Validate cert URL domain (anti-spoofing)
  try {
    const url = new URL(certUrl);
    if (!url.hostname.endsWith('.paypal.com') && !url.hostname.endsWith('.symantec.com')) {
      return { valid: false, error: 'Invalid PayPal certificate URL domain' };
    }
  } catch {
    return { valid: false, error: 'Malformed PayPal certificate URL' };
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const isSandbox = process.env.PAYPAL_SANDBOX === 'true';
    const base = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    const verifyResp = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo:        authAlgo,
        cert_url:         certUrl,
        transmission_id:  transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id:       webhookId,
        webhook_event:    event,
      }),
    });

    if (!verifyResp.ok) {
      const err = await verifyResp.text();
      return { valid: false, error: `PayPal verify-webhook API failed: ${verifyResp.status} ${err}` };
    }

    const result = await verifyResp.json();
    if (result.verification_status !== 'SUCCESS') {
      return { valid: false, error: `PayPal verification_status: ${result.verification_status}` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `PayPal webhook verification exception: ${err.message}` };
  }
}

/**
 * POST /webhooks/paypal
 *
 * Vérification : appel API PayPal verify-webhook-signature (pas de HMAC local).
 * IMPORTANT: Ce route doit recevoir le body RAW (express.raw configuré dans server.ts).
 */
router.post('/paypal', webhookRateLimit, async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const eventId       = event.id        || 'unknown';
  const eventType     = event.event_type || 'unknown';
  const transmissionId = req.headers['paypal-transmission-id'] as string | undefined;

  logger.info(`PayPal webhook: ${eventType}`, { eventId });

  // Stocker l'événement brut immédiatement (idempotent via upsert)
  await supabaseAdmin.from('paypal_webhook_events').upsert({
    event_id:          eventId,
    event_type:        eventType,
    resource_type:     event.resource_type,
    resource_id:       event.resource?.id,
    summary:           event.summary,
    paypal_order_id:   event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id,
    transmission_id:   transmissionId,
    transmission_time: req.headers['paypal-transmission-time'],
    processing_status: 'received',
    raw_payload:       event,
    signature_verified: false,
  }, { onConflict: 'event_id' });

  // Vérification signature via API PayPal
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    logger.warn('PayPal webhook: PAYPAL_WEBHOOK_ID non configuré — signature ignorée');
    void supabaseAdmin.from('paypal_webhook_events')
      .update({ processing_status: 'failed', processing_error: 'PAYPAL_WEBHOOK_ID not configured' })
      .eq('event_id', eventId);
    res.json({ received: true, warning: 'webhook_id_missing' });
    return;
  }

  const verification = await verifyPayPalWebhookSignature(req as any, rawBody, webhookId, event);

  if (!verification.valid) {
    logger.warn(`PayPal webhook: signature invalide — ${verification.error}`);
    void supabaseAdmin.from('paypal_webhook_events')
      .update({ processing_status: 'failed', processing_error: verification.error })
      .eq('event_id', eventId);
    await auditTrail.log({
      actorId: 'paypal',
      actorType: 'webhook',
      action: 'webhook.signature_invalid',
      resourceType: 'webhook',
      resourceId: eventId,
      ip: req.ip || undefined,
      riskLevel: 'critical',
    });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // Signature valide
  void supabaseAdmin.from('paypal_webhook_events')
    .update({ signature_verified: true, processing_status: 'verified' })
    .eq('event_id', eventId);

  // Traitement des événements
  try {
    const resource = event.resource || {};

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const captureId = resource.id;
        const orderId   = resource.supplementary_data?.related_ids?.order_id;
        const amount    = parseFloat(resource.amount?.value || '0');
        const currency  = resource.amount?.currency_code || 'USD';

        logger.info(`PayPal: capture completed ${captureId}`, { orderId, amount, currency });

        if (orderId) {
          // Confirmer la commande
          const { data: orders } = await supabaseAdmin
            .from('orders')
            .select('id, user_id, total_amount, status')
            .eq('payment_intent_id', orderId)
            .eq('status', 'pending');

          if (orders?.length) {
            await supabaseAdmin.from('orders')
              .update({ status: 'confirmed', payment_status: 'paid' })
              .eq('id', orders[0].id);
            logger.info(`PayPal: commande ${orders[0].id} confirmée`);
          }

          // Créditer le wallet pour les dépôts en attente
          const { data: deposits } = await supabaseAdmin
            .from('wallet_transactions')
            .select('id, user_id, amount, status')
            .eq('reference', orderId)
            .eq('status', 'pending');

          if (deposits?.length) {
            const deposit = deposits[0];
            await supabaseAdmin.rpc('process_wallet_transaction', {
              p_sender_id:   null,
              p_receiver_id: deposit.user_id,
              p_amount:      deposit.amount,
              p_currency:    'GNF',
              p_description: `Dépôt PayPal (${amount} ${currency})`,
            });
            await supabaseAdmin.from('wallet_transactions')
              .update({ status: 'completed' })
              .eq('id', deposit.id);
            logger.info(`PayPal: wallet crédité user=${deposit.user_id}`);
          }
        }
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED': {
        const orderId    = resource.supplementary_data?.related_ids?.order_id;
        const newStatus  = eventType === 'PAYMENT.CAPTURE.DENIED' ? 'failed' : 'refunded';

        logger.warn(`PayPal: capture ${newStatus} pour orderId=${orderId}`);

        if (orderId) {
          await supabaseAdmin.from('orders')
            .update({ status: newStatus, payment_status: newStatus })
            .eq('payment_intent_id', orderId);
        }
        break;
      }

      case 'CHECKOUT.ORDER.APPROVED':
        // La capture suivra automatiquement — pas d'action requise
        logger.info(`PayPal: order approved ${resource.id} — en attente de capture`);
        break;

      default:
        logger.info(`PayPal webhook: événement non géré "${eventType}"`);
    }

    void supabaseAdmin.from('paypal_webhook_events')
      .update({ processing_status: 'processed', processed_at: new Date().toISOString() })
      .eq('event_id', eventId);

    res.json({ received: true, event_type: eventType });

  } catch (err: any) {
    logger.error(`PayPal webhook processing error: ${err.message}`, { eventId, eventType });
    void supabaseAdmin.from('paypal_webhook_events')
      .update({ processing_status: 'failed', processing_error: err.message })
      .eq('event_id', eventId);
    res.json({ received: true, event_type: eventType }); // 200 pour éviter les re-livraisons PayPal
  }
});

// ─────────────────────────────────────────────────────────
// CHAPCHAPPAY WEBHOOK HANDLER
// ─────────────────────────────────────────────────────────

const CCP_STATUS_MAP: Record<string, string> = {
  PENDING:    'pending',
  PROCESSING: 'processing',
  SUCCESS:    'completed',
  COMPLETED:  'completed',
  FAILED:     'failed',
  CANCELLED:  'cancelled',
  EXPIRED:    'failed',
};

/**
 * POST /webhooks/chapchappay
 *
 * IMPORTANT: This route must receive RAW body (not parsed JSON).
 * Configure express.raw() for this route in server.ts.
 *
 * Signature: HMAC-SHA256(CCP_SECRET_KEY, timestamp + rawBody) in hex
 * Headers: x-ccp-signature, x-timestamp
 */
router.post('/chapchappay', webhookRateLimit, async (req: Request, res: Response) => {
  const signature  = (req.headers['x-ccp-signature']  as string) || '';
  const timestamp  = (req.headers['x-timestamp']       as string) || '';

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

  // Signature verification
  const secretKey = process.env.CCP_SECRET_KEY || process.env.CCP_ENCRYPTION_KEY;
  if (signature && secretKey) {
    const expected = crypto.createHmac('sha256', secretKey).update(timestamp + rawBody).digest('hex');
    if (expected !== signature) {
      logger.warn('ChapChapPay webhook: signature invalide — rejet');
      res.status(401).json({ success: false, error: 'Invalid signature' });
      return;
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { event_type, transaction_id, order_id, status, amount, paid_amount, fees, payment_method, customer_phone, completed_at } = payload;
  logger.info(`ChapChapPay webhook: ${event_type}`, { transaction_id, status });

  try {
    // Log webhook event
    await supabaseAdmin.from('chapchappay_webhooks').insert({
      event_type,
      transaction_id,
      order_id,
      payload,
      processed: false,
    });

    const internalStatus = CCP_STATUS_MAP[status?.toUpperCase()] || status?.toLowerCase() || 'unknown';

    // Update mobile_money_transactions
    const { data: transaction } = await supabaseAdmin
      .from('mobile_money_transactions')
      .update({
        status: internalStatus,
        paid_amount,
        fees,
        completed_at,
        provider_response: payload,
        updated_at: new Date().toISOString(),
      })
      .or(`provider_transaction_id.eq.${transaction_id},order_id.eq.${order_id}`)
      .select()
      .single();

    // Credit wallet for completed PULL payments
    if (internalStatus === 'completed' && (transaction as any)?.payment_type === 'pull' && (transaction as any)?.user_id) {
      const { data: wallet } = await supabaseAdmin
        .from('wallets').select('id, balance').eq('user_id', (transaction as any).user_id).single();
      if (wallet) {
        const credit = paid_amount || amount;
        await supabaseAdmin.from('wallets').update({ balance: Number(wallet.balance) + credit, updated_at: new Date().toISOString() }).eq('id', wallet.id);
        void supabaseAdmin.from('wallet_transactions').insert({
          transaction_id: `CCP-${transaction_id}`,
          transaction_type: 'deposit',
          amount: credit,
          net_amount: credit - (fees || 0),
          fee: fees || 0,
          currency: 'GNF',
          status: 'completed',
          description: `Dépôt Mobile Money (${payment_method})`,
          receiver_wallet_id: wallet.id,
          metadata: { provider: 'chapchappay', ccp_transaction_id: transaction_id, payment_method, customer_phone },
        });
        logger.info(`ChapChapPay: wallet crédité user=${(transaction as any).user_id}, montant=${credit}`);
      }
    }

    // Mark as processed
    await supabaseAdmin.from('chapchappay_webhooks').update({ processed: true }).eq('transaction_id', transaction_id);

    res.json({ success: true, message: 'Webhook processed', status: internalStatus });

  } catch (err: any) {
    logger.error(`ChapChapPay webhook error: ${err.message}`, { transaction_id, event_type });
    res.json({ success: false, error: err.message }); // 200 pour éviter les re-livraisons
  }
});

export default router;
