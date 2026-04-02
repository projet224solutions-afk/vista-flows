/**
 * 📋 JOB QUEUE SYSTEM - Phase 6
 * 
 * BullMQ-based async job queue for non-blocking tasks.
 * Falls back to direct execution if Redis unavailable.
 * 
 * Supported jobs:
 *   - recommendations.recalculate
 *   - pos.reconcile
 *   - notifications.send
 *   - idempotency.cleanup
 *   - escrow.auto-release
 *   - orders.stuck-alert
 *   - subscriptions.expire-check
 *   - fx.african-rates-refresh
 */

import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { AFRICAN_BANK_SOURCE_URLS } from '../constants/africanBankSources.js';

const REDIS_JOBS_ENABLED = (process.env.REDIS_ENABLED ?? (env.isProduction ? 'true' : 'false')) === 'true';

// ==================== REDIS CONNECTION (for BullMQ) ====================

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as any,
};

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

function isFxSuccessStatus(status: string | null | undefined): boolean {
  const normalized = (status || '').toLowerCase();
  return normalized === 'success' || normalized === 'completed' || normalized === 'ok';
}

async function createFxAlert(params: {
  alertType: string;
  title: string;
  description: string;
  severity: 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  dedupeMinutes?: number;
}) {
  const dedupeMinutes = params.dedupeMinutes ?? 60;
  const dedupeCutoff = new Date(Date.now() - dedupeMinutes * 60 * 1000).toISOString();

  const { data: existing } = await supabaseAdmin
    .from('financial_security_alerts')
    .select('id')
    .eq('alert_type', params.alertType)
    .eq('is_resolved', false)
    .gte('created_at', dedupeCutoff)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return;
  }

  await supabaseAdmin.from('financial_security_alerts').insert({
    user_id: SYSTEM_USER_ID,
    alert_type: params.alertType,
    severity: params.severity,
    title: params.title,
    description: params.description,
    metadata: params.metadata || {},
  }).catch(() => {});
}

// ==================== JOB REGISTRY ====================

type JobHandler = (data: any) => Promise<void>;
const jobHandlers = new Map<string, JobHandler>();

// ==================== JOB LOGGER (DB) ====================

async function logJobExecution(
  jobName: string,
  queueName: string,
  status: 'started' | 'completed' | 'failed' | 'retrying',
  startedAt: Date,
  attempt: number = 1,
  errorMessage?: string,
  metadata?: any
): Promise<void> {
  try {
    const now = new Date();
    await supabaseAdmin.from('job_execution_log').insert({
      job_name: jobName,
      queue_name: queueName,
      status,
      started_at: startedAt.toISOString(),
      completed_at: status === 'completed' || status === 'failed' ? now.toISOString() : null,
      duration_ms: status === 'completed' || status === 'failed' ? now.getTime() - startedAt.getTime() : null,
      error_message: errorMessage || null,
      metadata: metadata || {},
      attempt,
    });
  } catch (err: any) {
    logger.warn(`Job log write failed: ${err.message}`);
  }
}

// ==================== QUEUES ====================

let mainQueue: Queue | null = null;
let criticalQueue: Queue | null = null;
let mainWorker: Worker | null = null;
let criticalWorker: Worker | null = null;
let recurringTimers: Array<ReturnType<typeof setInterval>> = [];

function createQueue(name: string): Queue | null {
  try {
    return new Queue(name, { connection: REDIS_CONNECTION, defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 }, // 24h
      removeOnFail: { age: 7 * 86400 }, // 7 days
    }});
  } catch (err: any) {
    logger.warn(`Queue creation failed (${name}): ${err.message}`);
    return null;
  }
}

function createWorker(queueName: string, concurrency: number = 3): Worker | null {
  try {
    const worker = new Worker(queueName, async (job: Job) => {
      const handler = jobHandlers.get(job.name);
      if (!handler) {
        logger.warn(`No handler for job: ${job.name}`);
        return;
      }

      const startedAt = new Date();
      await logJobExecution(job.name, queueName, 'started', startedAt, job.attemptsMade + 1);

      try {
        await handler(job.data);
        await logJobExecution(job.name, queueName, 'completed', startedAt, job.attemptsMade + 1);
        logger.info(`Job completed: ${job.name} (${job.id})`);
      } catch (err: any) {
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 3);
        await logJobExecution(
          job.name, queueName,
          isLastAttempt ? 'failed' : 'retrying',
          startedAt, job.attemptsMade + 1,
          err.message, job.data
        );
        throw err; // BullMQ handles retry
      }
    }, { connection: REDIS_CONNECTION, concurrency });

    worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${job?.name} (${job?.id}) — ${err.message}`);
    });

    return worker;
  } catch (err: any) {
    logger.warn(`Worker creation failed (${queueName}): ${err.message}`);
    return null;
  }
}

// ==================== REGISTER JOB HANDLERS ====================

function registerHandler(name: string, handler: JobHandler): void {
  jobHandlers.set(name, handler);
}

// ==================== JOB DEFINITIONS ====================

registerHandler('idempotency.cleanup', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabaseAdmin
    .from('idempotency_keys')
    .delete()
    .lt('expires_at', cutoff);
  logger.info(`Idempotency cleanup: deleted ${count || 0} expired keys`);
});

registerHandler('escrow.auto-release', async () => {
  const now = new Date().toISOString();
  const { data: escrows } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, order_id, seller_id, amount, currency')
    .eq('status', 'held')
    .lt('auto_release_at', now);

  if (!escrows?.length) return;

  for (const escrow of escrows) {
    try {
      await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'released', released_at: now })
        .eq('id', escrow.id);

      // Credit seller wallet
      if (escrow.seller_id) {
        await supabaseAdmin.rpc('credit_wallet', {
          p_user_id: escrow.seller_id,
          p_amount: escrow.amount,
          p_description: `Libération escrow commande`,
          p_transaction_type: 'escrow_release',
          p_reference: escrow.id,
        });
      }

      logger.info(`Escrow auto-released: ${escrow.id}, amount=${escrow.amount}`);
    } catch (err: any) {
      logger.error(`Escrow release failed: ${escrow.id} — ${err.message}`);
    }
  }
});

registerHandler('subscriptions.expire-check', async () => {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'expired' })
    .in('status', ['active', 'trialing', 'past_due'])
    .lt('current_period_end', now)
    .select('id');

  logger.info(`Subscriptions expired: ${data?.length || 0}`);
});

registerHandler('orders.stuck-alert', async () => {
  const stuckThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: stuck } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, status, created_at')
    .eq('status', 'pending')
    .lt('created_at', stuckThreshold)
    .limit(50);

  if (stuck?.length) {
    logger.warn(`Stuck orders detected: ${stuck.length}`, { orderIds: stuck.map(o => o.id) });
    // Could send admin notification here
  }
});

registerHandler('pos.reconcile', async () => {
  // P0 OPTIMIZED: Uses decrement_stock_batch for batch processing
  const { data: pending } = await supabaseAdmin
    .from('pos_stock_reconciliation')
    .select('id, product_id, expected_decrement, retry_count, max_retries')
    .eq('status', 'pending')
    .limit(100);

  if (!pending?.length) return;

  const now = new Date().toISOString();

  // Group by similar items for batch processing
  const batchItems = pending.map(rec => ({
    product_id: rec.product_id,
    quantity: rec.expected_decrement,
  }));

  const { data: batchResult, error: batchError } = await supabaseAdmin.rpc('decrement_stock_batch', {
    p_items: batchItems,
  });

  if (!batchError && batchResult?.success) {
    // All succeeded — mark all as resolved
    const ids = pending.map(r => r.id);
    await supabaseAdmin
      .from('pos_stock_reconciliation')
      .update({ status: 'resolved', resolved_at: now, last_retry_at: now })
      .in('id', ids);

    logger.info(`POS reconciliation: ${pending.length}/${pending.length} resolved (batch)`);
  } else {
    // Batch failed — fall back to individual retries
    const errorMsg = batchError?.message || batchResult?.error || 'Batch failed';
    let fixed = 0;

    for (const rec of pending) {
      try {
        await supabaseAdmin.rpc('decrement_product_stock', {
          p_product_id: rec.product_id,
          p_quantity: rec.expected_decrement,
        });

        await supabaseAdmin
          .from('pos_stock_reconciliation')
          .update({ status: 'resolved', resolved_at: now, last_retry_at: now })
          .eq('id', rec.id);

        fixed++;
      } catch (err: any) {
        const newRetry = (rec.retry_count || 0) + 1;
        const maxRetries = rec.max_retries || 5;

        await supabaseAdmin
          .from('pos_stock_reconciliation')
          .update({
            retry_count: newRetry,
            last_retry_at: now,
            status: newRetry >= maxRetries ? 'failed' : 'pending',
            error_message: err.message,
          })
          .eq('id', rec.id);

        logger.warn(`POS reconcile retry failed: ${rec.id} (attempt ${newRetry}/${maxRetries}) — ${err.message}`);
      }
    }
    logger.info(`POS reconciliation: ${fixed}/${pending.length} resolved (fallback)`);
  }
});

registerHandler('recommendations.recalculate', async () => {
  // Aligned with real schema:
  //   user_activity.action_type (NOT activity_type)
  //   product_scores columns: views_count, clicks_count, cart_count,
  //     purchases_count, total_score, trending_score, conversion_rate,
  //     is_featured, last_computed
  // Weights match useSmartRecommendations.ts engine
  const ACTION_WEIGHTS: Record<string, number> = {
    purchase: 5,
    add_to_cart: 3,
    click: 2,
    view: 1,
  };

  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();

  // Fetch recent activity — real column is action_type
  const { data: activities } = await supabaseAdmin
    .from('user_activity')
    .select('product_id, action_type')
    .gte('created_at', cutoff)
    .not('product_id', 'is', null)
    .limit(10000);

  if (!activities?.length) {
    logger.info('Recommendations recalculate: no recent activity');
    return;
  }

  // Aggregate counts per product per action_type
  const productStats = new Map<string, { views: number; clicks: number; carts: number; purchases: number }>();

  for (const act of activities) {
    if (!act.product_id) continue;
    const stats = productStats.get(act.product_id) || { views: 0, clicks: 0, carts: 0, purchases: 0 };

    switch (act.action_type) {
      case 'view': stats.views++; break;
      case 'click': stats.clicks++; break;
      case 'add_to_cart': stats.carts++; break;
      case 'purchase': stats.purchases++; break;
      default: stats.views++; // fallback
    }

    productStats.set(act.product_id, stats);
  }

  // Upsert into product_scores with real columns
  const now = new Date().toISOString();
  let updated = 0;

  for (const [productId, stats] of productStats) {
    const totalScore =
      stats.views * ACTION_WEIGHTS.view +
      stats.clicks * ACTION_WEIGHTS.click +
      stats.carts * ACTION_WEIGHTS.add_to_cart +
      stats.purchases * ACTION_WEIGHTS.purchase;

    const conversionRate = stats.views > 0 ? stats.purchases / stats.views : 0;

    try {
      await supabaseAdmin
        .from('product_scores')
        .upsert({
          product_id: productId,
          views_count: stats.views,
          clicks_count: stats.clicks,
          cart_count: stats.carts,
          purchases_count: stats.purchases,
          total_score: totalScore,
          trending_score: totalScore, // same as total for 7-day window
          conversion_rate: Math.round(conversionRate * 10000) / 10000,
          last_computed: now,
        }, { onConflict: 'product_id' });
      updated++;
    } catch { /* continue */ }
  }

  logger.info(`Recommendations recalculated: ${updated} products scored from ${activities.length} activities`);
});

registerHandler('payment-links.cleanup-expired', async () => {
  const now = new Date().toISOString();
  const { data: expired, error } = await supabaseAdmin
    .from('payment_links')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .select('id, payment_id');

  if (error) {
    logger.warn(`Payment links cleanup failed: ${error.message}`);
  } else if (expired?.length) {
    logger.info(`Payment links cleanup: marked ${expired.length} links as expired`);
  }
});

registerHandler('fx.african-rates-refresh', async () => {
  try {
    const functionUrl = `${env.SUPABASE_URL}/functions/v1/african-fx-collect`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'backend_hourly_job',
        strict_african_sources: true,
        include_all_african_banks: true,
        preferred_source_urls: AFRICAN_BANK_SOURCE_URLS,
      }),
    });

    const raw = await response.text();
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { raw };
    }

    if (!response.ok) {
      const message = payload?.error || payload?.message || `HTTP ${response.status}`;
      await createFxAlert({
        alertType: 'fx_collection_failed',
        severity: 'high',
        title: 'Échec collecte FX horaire',
        description: `La collecte horaire des taux a échoué: ${message}`,
        metadata: { status: response.status, payload },
        dedupeMinutes: 30,
      });
      throw new Error(`African FX collect failed: ${message}`);
    }

    const { data: latestRate } = await supabaseAdmin
      .from('currency_exchange_rates')
      .select('retrieved_at')
      .eq('is_active', true)
      .order('retrieved_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const lastRetrievedAt = latestRate?.retrieved_at ? new Date(latestRate.retrieved_at).getTime() : 0;
    const ageMinutes = lastRetrievedAt ? Math.floor((now - lastRetrievedAt) / 60000) : 9999;
    if (ageMinutes > 90) {
      await createFxAlert({
        alertType: 'fx_rates_stale',
        severity: 'critical',
        title: 'Taux FX obsolètes',
        description: `Les taux ne sont pas à jour depuis ${ageMinutes} minutes (>90).`,
        metadata: { age_minutes: ageMinutes, threshold_minutes: 90 },
        dedupeMinutes: 60,
      });
    }

    const { data: recentGnfRuns } = await supabaseAdmin
      .from('fx_collection_log')
      .select('status, collected_at, error_message')
      .eq('currency_code', 'GNF')
      .order('collected_at', { ascending: false })
      .limit(2);

    const twoConsecutiveFailures = (recentGnfRuns || []).length >= 2
      && (recentGnfRuns || []).every((run) => !isFxSuccessStatus(run.status));

    if (twoConsecutiveFailures) {
      await createFxAlert({
        alertType: 'fx_two_consecutive_failures',
        severity: 'critical',
        title: 'Collecte FX en échec consécutif',
        description: 'Deux collectes consécutives ont échoué pour GNF.',
        metadata: { recent_runs: recentGnfRuns },
        dedupeMinutes: 60,
      });
    }

    logger.info('African FX rates refreshed from official sources', {
      status: response.status,
      source: payload?.source || 'african-fx-collect',
      collected: payload?.collected_count || payload?.updated_count || null,
    });
  } catch (error: any) {
    throw error;
  }
});

// ==================== PUBLIC API ====================

export const jobQueue = {
  /**
   * Initialize queues and workers. Call once at app startup.
   */
  async init(): Promise<void> {
    if (!REDIS_JOBS_ENABLED) {
      logger.info('Job queues disabled (REDIS_ENABLED=false), using direct execution fallback');
      return;
    }

    try {
      mainQueue = createQueue('main');
      criticalQueue = createQueue('critical');
      mainWorker = createWorker('main', 3);
      criticalWorker = createWorker('critical', 5);

      if (mainQueue && criticalQueue) {
        logger.info('✅ Job queues initialized (main + critical)');
      } else {
        logger.warn('⚠️ Job queues not available, will use direct execution');
      }
    } catch (err: any) {
      logger.warn(`Job queue init failed: ${err.message}, using fallback`);
    }
  },

  /**
   * Enqueue a job. Falls back to direct execution if queues unavailable.
   */
  async enqueue(jobName: string, data: any = {}, options?: { priority?: boolean; delay?: number }): Promise<void> {
    const queue = options?.priority ? criticalQueue : mainQueue;

    if (queue) {
      try {
        await queue.add(jobName, data, {
          delay: options?.delay,
          priority: options?.priority ? 1 : undefined,
        });
        logger.info(`Job enqueued: ${jobName}`);
        return;
      } catch (err: any) {
        logger.warn(`Job enqueue failed, executing directly: ${err.message}`);
      }
    }

    // Fallback: direct execution (non-blocking)
    const handler = jobHandlers.get(jobName);
    if (handler) {
      const startedAt = new Date();
      handler(data)
        .then(() => logJobExecution(jobName, 'direct', 'completed', startedAt))
        .catch((err) => {
          logger.error(`Direct job failed: ${jobName} — ${err.message}`);
          logJobExecution(jobName, 'direct', 'failed', startedAt, 1, err.message);
        });
    } else {
      logger.warn(`No handler for job: ${jobName}`);
    }
  },

  /**
   * Schedule recurring jobs. Call once at startup.
   */
  async scheduleRecurring(): Promise<void> {
    if (!env.ENABLE_CRON_JOBS) {
      logger.info('Recurring jobs disabled by ENABLE_CRON_JOBS=false');
      return;
    }

    if (!REDIS_JOBS_ENABLED) {
      logger.info('Recurring jobs using in-process fallback scheduler (Redis disabled)');

      const everyHour = 3600000;
      const every6Hours = 6 * 3600000;
      const every24Hours = 24 * 3600000;

      // Trigger FX immediately on startup to avoid missing today's first rate.
      this.enqueue('fx.african-rates-refresh', {}).catch(() => {});

      recurringTimers.push(setInterval(() => this.enqueue('idempotency.cleanup', {}).catch(() => {}), everyHour));
      recurringTimers.push(setInterval(() => this.enqueue('orders.stuck-alert', {}).catch(() => {}), everyHour));
      recurringTimers.push(setInterval(() => this.enqueue('payment-links.cleanup-expired', {}).catch(() => {}), everyHour));
      recurringTimers.push(setInterval(() => this.enqueue('fx.african-rates-refresh', {}).catch(() => {}), everyHour));

      recurringTimers.push(setInterval(() => this.enqueue('escrow.auto-release', {}).catch(() => {}), every6Hours));
      recurringTimers.push(setInterval(() => this.enqueue('subscriptions.expire-check', {}).catch(() => {}), every6Hours));
      recurringTimers.push(setInterval(() => this.enqueue('pos.reconcile', {}).catch(() => {}), every6Hours));

      recurringTimers.push(setInterval(() => this.enqueue('recommendations.recalculate', {}).catch(() => {}), every24Hours));

      logger.info('✅ In-process recurring jobs scheduled');
      return;
    }

    const queue = mainQueue;
    if (!queue) {
      logger.warn('Recurring jobs not scheduled: no queue available');
      return;
    }

    try {
      // Every hour: cleanup + stuck orders
      await queue.add('idempotency.cleanup', {}, { repeat: { every: 3600000 } });
      await queue.add('orders.stuck-alert', {}, { repeat: { every: 3600000 } });
      await queue.add('payment-links.cleanup-expired', {}, { repeat: { every: 3600000 } });
      await queue.add('fx.african-rates-refresh', {}, { repeat: { every: 3600000 } });

      // Every 6 hours: escrow + subscriptions + POS
      await queue.add('escrow.auto-release', {}, { repeat: { every: 6 * 3600000 } });
      await queue.add('subscriptions.expire-check', {}, { repeat: { every: 6 * 3600000 } });
      await queue.add('pos.reconcile', {}, { repeat: { every: 6 * 3600000 } });

      // Daily: recommendations
      await queue.add('recommendations.recalculate', {}, { repeat: { every: 24 * 3600000 } });

      logger.info('✅ Recurring jobs scheduled');
    } catch (err: any) {
      logger.warn(`Recurring job scheduling failed: ${err.message}`);
    }
  },

  /**
   * Graceful shutdown.
   */
  async shutdown(): Promise<void> {
    recurringTimers.forEach((timer) => clearInterval(timer));
    recurringTimers = [];

    await mainWorker?.close();
    await criticalWorker?.close();
    await mainQueue?.close();
    await criticalQueue?.close();
    logger.info('Job queues shut down');
  },
};

export default jobQueue;
