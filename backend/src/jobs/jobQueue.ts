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
 */

import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

// ==================== REDIS CONNECTION (for BullMQ) ====================

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as any,
};

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
  // Aligned with pos.routes.ts: table pos_stock_reconciliation
  // Real fields: expected_decrement, status ('pending'/'resolved'/'failed'), retry_count, max_retries
  const { data: pending } = await supabaseAdmin
    .from('pos_stock_reconciliation')
    .select('id, product_id, expected_decrement, retry_count, max_retries')
    .eq('status', 'pending')
    .limit(100);

  if (!pending?.length) return;

  let fixed = 0;
  for (const rec of pending) {
    try {
      // Retry the stock decrement that originally failed
      await supabaseAdmin.rpc('decrement_product_stock', {
        p_product_id: rec.product_id,
        p_quantity: rec.expected_decrement,
      });

      // Mark as resolved
      await supabaseAdmin
        .from('pos_stock_reconciliation')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', rec.id);

      fixed++;
    } catch (err: any) {
      // Increment retry_count, mark as failed if exceeded max
      const newRetry = (rec.retry_count || 0) + 1;
      const maxRetries = rec.max_retries || 5;
      await supabaseAdmin
        .from('pos_stock_reconciliation')
        .update({
          retry_count: newRetry,
          status: newRetry >= maxRetries ? 'failed' : 'pending',
          error_message: err.message,
        })
        .eq('id', rec.id);

      logger.warn(`POS reconcile retry failed: ${rec.id} (attempt ${newRetry}/${maxRetries}) — ${err.message}`);
    }
  }
  logger.info(`POS reconciliation: ${fixed}/${pending.length} resolved`);
});

registerHandler('recommendations.recalculate', async () => {
  // Aligned with real recommendation engine: user_activity + product_scores tables
  // Scoring weights: purchase=5, add_to_cart=3, click=2, view=1
  const WEIGHTS: Record<string, number> = {
    purchase: 5,
    add_to_cart: 3,
    click: 2,
    view: 1,
  };

  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();

  // Fetch recent activity aggregated by product
  const { data: activities } = await supabaseAdmin
    .from('user_activity')
    .select('product_id, activity_type')
    .gte('created_at', cutoff)
    .not('product_id', 'is', null)
    .limit(10000);

  if (!activities?.length) {
    logger.info('Recommendations recalculate: no recent activity');
    return;
  }

  // Aggregate scores per product
  const scores = new Map<string, number>();
  for (const act of activities) {
    if (!act.product_id) continue;
    const weight = WEIGHTS[act.activity_type] || 1;
    scores.set(act.product_id, (scores.get(act.product_id) || 0) + weight);
  }

  // Upsert into product_scores (the real table used by smart-recommendations)
  let updated = 0;
  for (const [productId, score] of scores) {
    try {
      await supabaseAdmin
        .from('product_scores')
        .upsert({
          product_id: productId,
          popularity_score: score,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id' });
      updated++;
    } catch { /* continue */ }
  }

  logger.info(`Recommendations recalculated: ${updated} products scored from ${activities.length} activities`);
});

// ==================== PUBLIC API ====================

export const jobQueue = {
  /**
   * Initialize queues and workers. Call once at app startup.
   */
  async init(): Promise<void> {
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
    const queue = mainQueue;
    if (!queue) {
      logger.warn('Recurring jobs not scheduled: no queue available');
      return;
    }

    try {
      // Every hour: cleanup + stuck orders
      await queue.add('idempotency.cleanup', {}, { repeat: { every: 3600000 } });
      await queue.add('orders.stuck-alert', {}, { repeat: { every: 3600000 } });

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
    await mainWorker?.close();
    await criticalWorker?.close();
    await mainQueue?.close();
    await criticalQueue?.close();
    logger.info('Job queues shut down');
  },
};

export default jobQueue;
