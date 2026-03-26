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
  const { data: failed } = await supabaseAdmin
    .from('pos_stock_reconciliation')
    .select('id, product_id, quantity_sold, sync_status')
    .eq('sync_status', 'failed')
    .limit(100);

  if (!failed?.length) return;

  let fixed = 0;
  for (const rec of failed) {
    try {
      await supabaseAdmin.rpc('decrement_product_stock', {
        p_product_id: rec.product_id,
        p_quantity: rec.quantity_sold,
      });
      await supabaseAdmin
        .from('pos_stock_reconciliation')
        .update({ sync_status: 'synced', synced_at: new Date().toISOString() })
        .eq('id', rec.id);
      fixed++;
    } catch (err: any) {
      logger.warn(`POS reconcile failed: ${rec.id} — ${err.message}`);
    }
  }
  logger.info(`POS reconciliation: ${fixed}/${failed.length} fixed`);
});

registerHandler('recommendations.recalculate', async () => {
  // Recalculate popularity scores
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('is_active', true)
    .limit(500);

  if (!products?.length) return;

  for (const product of products) {
    try {
      // Count recent views
      const { count: viewCount } = await supabaseAdmin
        .from('product_views_raw')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', product.id)
        .gte('viewed_at', new Date(Date.now() - 7 * 86400000).toISOString());

      // Upsert popularity score
      await supabaseAdmin
        .from('product_popularity_scores')
        .upsert({
          product_id: product.id,
          score: viewCount || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id' });
    } catch { /* continue */ }
  }
  logger.info(`Recommendations recalculated for ${products.length} products`);
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
