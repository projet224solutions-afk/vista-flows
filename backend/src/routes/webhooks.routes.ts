/**
 * 🔔 WEBHOOK HANDLERS - Backend Node.js centralisé
 *
 * Webhooks gérés côté Node.js :
 *   - Stripe  : /webhooks/stripe  (signature + idempotency + ordre/escrow/wallet)
 *
 * Migration :
 *   - stripe-webhook  (Edge Function) : partiellement dupliqué ici; Node.js est la version canonique
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { auditTrail } from '../services/auditTrail.service.js';
import { triggerAffiliateCommission } from '../services/commission.service.js';
import { webhookRateLimit } from '../middlewares/routeRateLimiter.js';

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
    const { data, error } = await supabaseAdmin
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

export default router;
