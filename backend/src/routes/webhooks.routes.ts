/**
 * 🔔 WEBHOOK HANDLERS - Backend Node.js centralisé
 *
 * Webhooks gérés côté Node.js :
 *   - Stripe  : /webhooks/stripe  (signature + idempotency + ordre/escrow/wallet)
 *   - Djomy   : /webhooks/djomy   (HMAC signature + trust score + wallet credit vendeur)
 *
 * Migration :
 *   - stripe-webhook  (Edge Function) : partiellement dupliqué ici; Node.js est la version canonique
 *   - djomy-secure-webhook (Edge Function) : migré entièrement dans /webhooks/djomy
 *   - djomy-webhook        (Edge Function) : remplacé par /webhooks/djomy
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { auditTrail } from '../services/auditTrail.service.js';
import { webhookRateLimit } from '../middlewares/routeRateLimiter.js';
import { verifyDjomyTransaction } from '../services/djomy.service.js';
import { creditWallet } from '../services/wallet.service.js';
import { triggerAffiliateCommission } from '../services/commission.service.js';

const router = Router();

// ==================== STRIPE SIGNATURE VERIFICATION ====================

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const elements = signature.split(',');
    const timestampElement = elements.find(e => e.startsWith('t='));
    const signatureElement = elements.find(e => e.startsWith('v1='));

    if (!timestampElement || !signatureElement) return false;

    const timestamp = timestampElement.split('=')[1];
    const expectedSig = signatureElement.split('=')[1];

    // Reject events older than 5 minutes (replay protection)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) {
      logger.warn('Stripe webhook: timestamp too old, possible replay');
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const computedSig = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(expectedSig));
  } catch (err: any) {
    logger.error(`Stripe signature verification error: ${err.message}`);
    return false;
  }
}

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

async function handlePaymentIntentSucceeded(event: any): Promise<void> {
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.order_id;
  const userId = paymentIntent.metadata?.user_id;

  logger.info(`Webhook: payment_intent.succeeded — PI=${paymentIntent.id}, order=${orderId}`);

  if (orderId) {
    // Update order payment status
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Update escrow to confirmed
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ payment_confirmed: true, updated_at: new Date().toISOString() })
      .eq('order_id', orderId);
  }

  // Record in stripe_payments if exists
  await supabaseAdmin
    .from('stripe_payments')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_intent_id', paymentIntent.id);

  // Credit wallet if it's a deposit
  if (paymentIntent.metadata?.type === 'wallet_deposit' && userId) {
    const amount = paymentIntent.amount / 100; // Stripe uses cents
    const currency = paymentIntent.currency?.toUpperCase() || 'GNF';

    await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_description: `Dépôt carte Stripe (${paymentIntent.id})`,
      p_transaction_type: 'deposit',
      p_reference: paymentIntent.id,
    });

    logger.info(`Wallet credited: user=${userId}, amount=${amount} ${currency}`);
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
  const refundAmount = charge.amount_refunded / 100;
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
// DJOMY WEBHOOK HANDLER
// Migré depuis djomy-secure-webhook + djomy-webhook Edge Functions
// ─────────────────────────────────────────────────────────

function verifyDjomyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(':');
    if (parts.length !== 2 || parts[0] !== 'v1') return false;
    const computedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(parts[1]));
  } catch {
    return false;
  }
}

interface TrustScoreResult {
  totalScore: number;
  decision: 'AUTO_RELEASE' | 'BLOCKED' | 'MANUAL_REVIEW';
  autoReleased: boolean;
  breakdown: Record<string, { score: number; maxScore: number; details: string }>;
}

async function calculateTrustScore(tx: any, djomyVerified: boolean): Promise<TrustScoreResult> {
  const { data: configs } = await supabaseAdmin.from('trust_score_config').select('config_key, config_value');
  const cfg: Record<string, number> = {};
  for (const c of configs || []) cfg[c.config_key] = Number(c.config_value);

  const threshold = cfg.auto_release_threshold || 70;
  const maxAutoAmount = cfg.max_auto_release_amount || 5000000;
  const amount = Number(tx.amount) || 0;
  const breakdown: TrustScoreResult['breakdown'] = {};
  let total = 0;

  // 1. Djomy confirmation (25 pts)
  const djomyPts = djomyVerified ? (cfg.weight_djomy_confirmed || 25) : 0;
  breakdown.djomy_confirmed = { score: djomyPts, maxScore: cfg.weight_djomy_confirmed || 25, details: djomyVerified ? 'Confirmé API Djomy' : 'Non confirmé' };
  total += djomyPts;

  // 2. Ancienneté du compte (15 pts)
  const maxUserAge = cfg.weight_user_age || 15;
  if (tx.user_id) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('created_at').eq('id', tx.user_id).maybeSingle();
    if (profile) {
      const days = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);
      const s = days > 365 ? maxUserAge : days > 180 ? maxUserAge * 0.8 : days > 90 ? maxUserAge * 0.6 : days > 30 ? maxUserAge * 0.4 : maxUserAge * 0.2;
      breakdown.user_age = { score: Math.round(s), maxScore: maxUserAge, details: `Compte: ${days} jours` };
      total += Math.round(s);
    } else {
      breakdown.user_age = { score: 0, maxScore: maxUserAge, details: 'Profil introuvable' };
    }
  } else {
    breakdown.user_age = { score: 0, maxScore: maxUserAge, details: 'Invité' };
  }

  // 3. KYC vendeur (20 pts)
  const maxKyc = cfg.weight_vendor_kyc || 20;
  let disputeCount = 0;
  if (tx.vendor_id) {
    const { data: vendor } = await supabaseAdmin.from('vendors').select('kyc_status, is_verified, dispute_count').eq('id', tx.vendor_id).maybeSingle();
    if (vendor) {
      const ks = (vendor.kyc_status === 'verified' || vendor.is_verified) ? maxKyc : vendor.kyc_status === 'pending' ? Math.round(maxKyc * 0.3) : 0;
      breakdown.vendor_kyc = { score: ks, maxScore: maxKyc, details: `KYC: ${vendor.kyc_status || 'pending'}` };
      total += ks;
      disputeCount = vendor.dispute_count || 0;
    } else {
      breakdown.vendor_kyc = { score: 0, maxScore: maxKyc, details: 'Vendeur introuvable' };
    }
  } else {
    const s = Math.round(maxKyc * 0.5);
    breakdown.vendor_kyc = { score: s, maxScore: maxKyc, details: 'Paiement direct' };
    total += s;
  }

  // 4. Montant (15 pts)
  const maxAmt = cfg.weight_transaction_amount || 15;
  let amtScore = maxAmt;
  if (amount > maxAutoAmount) amtScore = 0;
  else if (amount > maxAutoAmount * 0.5) amtScore = Math.round(maxAmt * 0.5);
  else if (amount > maxAutoAmount * 0.2) amtScore = Math.round(maxAmt * 0.8);
  breakdown.transaction_amount = { score: amtScore, maxScore: maxAmt, details: `${amount.toLocaleString()} GNF` };
  total += amtScore;

  // 5. Litiges (10 pts)
  const maxDispute = cfg.weight_no_disputes || 10;
  const ds = Math.max(0, maxDispute - disputeCount * 2);
  breakdown.no_disputes = { score: ds, maxScore: maxDispute, details: `${disputeCount} litige(s)` };
  total += ds;

  let decision: TrustScoreResult['decision'];
  let autoReleased = false;
  if (total >= threshold && amount <= maxAutoAmount && djomyVerified) { decision = 'AUTO_RELEASE'; autoReleased = true; }
  else if (total < threshold * 0.5) { decision = 'BLOCKED'; }
  else { decision = 'MANUAL_REVIEW'; }

  return { totalScore: total, decision, autoReleased, breakdown };
}

/**
 * POST /webhooks/djomy
 * Reçoit les événements webhook Djomy (payment.success, payment.failed, etc.)
 * Remplace les Edge Functions djomy-secure-webhook et djomy-webhook.
 * ⚠️ Requiert le body RAW — configurer express.raw() pour /webhooks/djomy dans server.ts
 */
router.post('/djomy', webhookRateLimit, async (req: Request, res: Response) => {
  const clientSecret = process.env.DJOMY_CLIENT_SECRET?.trim();
  const sourceIp = (req.headers['x-forwarded-for'] as string) || req.ip || '';

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8')
    : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  const webhookSignature = req.headers['x-webhook-signature'] as string;
  let signatureValid = false;

  // Signature obligatoire en production: ne jamais traiter un webhook non signé
  if (!webhookSignature) {
    logger.warn(`[DjomyWebhook] Missing signature header from ${sourceIp}`);
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  if (!clientSecret) {
    logger.error('[DjomyWebhook] DJOMY_CLIENT_SECRET not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  signatureValid = verifyDjomyWebhookSignature(rawBody, webhookSignature, clientSecret);
  if (!signatureValid) {
    logger.warn(`[DjomyWebhook] Invalid signature from ${sourceIp}`);
    await supabaseAdmin.from('djomy_webhook_logs').insert({
      event_type: 'SIGNATURE_INVALID', payload: { raw: rawBody.slice(0, 500) },
      signature_valid: false, ip_address: sourceIp, error_message: 'Invalid webhook signature',
    }).catch(() => {});
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { res.status(400).json({ error: 'Invalid JSON' }); return; }

  const { eventType, eventId, data } = payload;
  logger.info(`[DjomyWebhook] Received: ${eventType} (eventId=${eventId})`);

  // Anti-doublon
  if (eventId) {
    const { data: existingLog } = await supabaseAdmin.from('djomy_webhook_logs')
      .select('id, processed').eq('event_id', eventId).maybeSingle();
    if (existingLog?.processed) {
      res.json({ success: true, message: 'Already processed' });
      return;
    }
  }

  const { data: webhookLog } = await supabaseAdmin.from('djomy_webhook_logs')
    .insert({ event_id: eventId, event_type: eventType, transaction_id: data?.transactionId,
      payload, signature_valid: signatureValid, ip_address: sourceIp, processed: false })
    .select().maybeSingle();

  const statusMap: Record<string, string> = {
    'payment.created': 'PROCESSING', 'payment.redirected': 'PROCESSING',
    'payment.pending': 'PROCESSING', 'payment.success': 'SUCCESS',
    'payment.failed': 'FAILED', 'payment.cancelled': 'CANCELLED',
  };
  const internalStatus = statusMap[eventType] || 'PROCESSING';

  // Chercher la transaction locale
  let tx: any = null;
  if (data?.transactionId) {
    const { data: t1 } = await supabaseAdmin.from('djomy_transactions').select('*')
      .eq('djomy_transaction_id', data.transactionId).maybeSingle();
    tx = t1;
    if (!tx && data?.merchantPaymentReference) {
      const { data: t2 } = await supabaseAdmin.from('djomy_transactions').select('*')
        .eq('order_id', data.merchantPaymentReference).maybeSingle();
      tx = t2;
    }
  }

  if (!tx) {
    logger.warn(`[DjomyWebhook] Transaction not found: ${data?.transactionId}`);
    await supabaseAdmin.from('djomy_webhook_logs')
      .update({ processed: true, processed_at: new Date().toISOString(), error_message: 'Transaction not found' })
      .eq('id', webhookLog?.id || '').catch(() => {});
    res.json({ success: true, message: 'Transaction not found but logged' });
    return;
  }

  await supabaseAdmin.from('djomy_transactions').update({
    status: internalStatus, djomy_response: payload, updated_at: new Date().toISOString(),
    ...(data?.paidAmount && { received_amount: data.paidAmount }),
    ...(['SUCCESS', 'FAILED', 'CANCELLED'].includes(internalStatus) && { completed_at: new Date().toISOString() }),
  }).eq('id', tx.id);

  if (eventType === 'payment.success') {
    const djomyVerification = await verifyDjomyTransaction(data?.transactionId);
    const trustResult = await calculateTrustScore(tx, djomyVerification.verified);

    await supabaseAdmin.from('trust_score_logs').insert({
      transaction_id: tx.id, vendor_id: tx.vendor_id, user_id: tx.user_id,
      total_score: trustResult.totalScore, threshold_used: 70, auto_released: trustResult.autoReleased,
      score_breakdown: trustResult.breakdown, djomy_verification_result: djomyVerification,
      decision: trustResult.decision,
    }).catch(() => {});

    await supabaseAdmin.rpc('update_phone_history', { p_phone: tx.payer_phone || '', p_user_id: tx.user_id, p_success: true }).catch(() => {});

    const paidAmount = Number(data.paidAmount || tx.amount);
    const fees = Number(data.fees || paidAmount * 0.02);
    const receivedAmount = paidAmount - fees;

    if (tx.vendor_id) {
      const { data: blockedFund } = await supabaseAdmin.from('vendor_blocked_funds').insert({
        vendor_id: tx.vendor_id, transaction_id: tx.id, amount: receivedAmount,
        original_amount: paidAmount, fees, currency: 'GNF',
        status: trustResult.autoReleased ? 'RELEASED' : 'BLOCKED',
        trust_score: trustResult.totalScore, auto_released: trustResult.autoReleased,
        release_type: trustResult.autoReleased ? 'AUTO_RELEASE' : null,
        released_at: trustResult.autoReleased ? new Date().toISOString() : null,
      }).select().maybeSingle();

      if (trustResult.autoReleased) {
        const { data: vendor } = await supabaseAdmin.from('vendors').select('user_id').eq('id', tx.vendor_id).single();
        if (vendor?.user_id) {
          await creditWallet(vendor.user_id, receivedAmount,
            `Paiement auto-libéré (score: ${trustResult.totalScore}) - ${tx.order_id}`, tx.id, 'vendor_payment');
          await supabaseAdmin.from('admin_action_logs').insert({
            admin_id: '00000000-0000-0000-0000-000000000000',
            action_type: 'AUTO_RELEASE_FUNDS', target_type: 'vendor_blocked_funds',
            target_id: blockedFund?.id || tx.id,
            reason: `Score: ${trustResult.totalScore}/100`,
            new_value: { amount: receivedAmount, trust_score: trustResult.totalScore },
          }).catch(() => {});
        }
      } else {
        await supabaseAdmin.rpc('create_admin_notification', {
          p_type: 'PAYMENT_REVIEW_REQUIRED',
          p_title: 'Paiement nécessitant révision manuelle',
          p_message: `Transaction ${tx.order_id} de ${paidAmount.toLocaleString()} GNF bloquée. Score: ${trustResult.totalScore}/100.`,
          p_priority: trustResult.totalScore < 35 ? 'high' : 'medium',
          p_entity_type: 'djomy_transaction', p_entity_id: tx.id,
          p_metadata: { vendor_id: tx.vendor_id, amount: paidAmount, trust_score: trustResult.totalScore },
        }).catch(() => {});
      }
    }

    if (tx.user_id) {
      await triggerAffiliateCommission(tx.user_id, paidAmount, tx.payment_type || 'ORDER_PAYMENT', tx.id);
    }

    await auditTrail.log({
      actorId: tx.user_id || 'djomy', actorType: 'webhook', action: 'payment.djomy.success',
      resourceType: 'djomy_transaction', resourceId: tx.id,
      metadata: { amount: paidAmount, receivedAmount, trustScore: trustResult.totalScore, decision: trustResult.decision },
      riskLevel: trustResult.autoReleased ? 'low' : 'medium',
    });
  }

  if (eventType === 'payment.failed') {
    await supabaseAdmin.rpc('update_phone_history', { p_phone: tx.payer_phone || '', p_user_id: tx.user_id, p_success: false }).catch(() => {});
    await auditTrail.log({ actorId: tx.user_id || 'djomy', actorType: 'webhook', action: 'payment.djomy.failed',
      resourceType: 'djomy_transaction', resourceId: tx.id, metadata: { reason: data?.failureReason }, riskLevel: 'medium' });
  }

  await supabaseAdmin.from('djomy_webhook_logs')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('id', webhookLog?.id || '').catch(() => {});

  logger.info(`[DjomyWebhook] Processed: ${eventType} (txId=${tx.id})`);
  res.json({ success: true, message: 'Processed', status: internalStatus });
});

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
    logger.error('CRITICAL: STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  // Get raw body — express.raw() delivers a Buffer
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

  // Verify signature
  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    logger.warn('Stripe webhook: invalid signature');
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

  // Parse JSON from the validated raw body (never trust pre-parsed req.body for webhooks)
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
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
