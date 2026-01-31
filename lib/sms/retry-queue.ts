/**
 * SMS Retry Queue with BullMQ
 * Persistent job queue for SMS retries that survives server restarts
 *
 * Uses Upstash Redis for production or ioredis connection
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { retrySMS } from './retry-service';

// Redis connection configuration
const connection = {
  host: process.env.UPSTASH_REDIS_REST_URL
    ? new URL(process.env.UPSTASH_REDIS_REST_URL).hostname
    : 'localhost',
  port: process.env.UPSTASH_REDIS_REST_URL
    ? parseInt(new URL(process.env.UPSTASH_REDIS_REST_URL).port) || 6379
    : 6379,
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  // Upstash Redis requires TLS
  tls: process.env.UPSTASH_REDIS_REST_URL ? {} : undefined,
};

// Create SMS retry queue
export const smsRetryQueue = new Queue('sms-retry', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Max 3 retry attempts
    backoff: {
      type: 'exponential',
      delay: 5 * 60 * 1000, // Start with 5 minutes
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // Keep completed jobs for 7 days
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 30 * 24 * 60 * 60, // Keep failed jobs for 30 days
      count: 5000, // Keep max 5000 failed jobs
    },
  },
});

// Job data interface
interface SMSRetryJob {
  smsId: string;
  attempt: number;
  originalPhone: string;
  originalMessage: string;
}

/**
 * Add SMS to retry queue
 */
export async function addSMSRetry(
  smsId: string,
  attempt: number,
  phone: string,
  message: string,
  delayMs: number
): Promise<Job<SMSRetryJob>> {
  const job = await smsRetryQueue.add(
    'retry-sms',
    {
      smsId,
      attempt,
      originalPhone: phone,
      originalMessage: message,
    },
    {
      delay: delayMs,
      jobId: `sms-${smsId}-attempt-${attempt}`, // Prevent duplicate retries
    }
  );

  console.log(`⏰ Added SMS ${smsId} to retry queue, attempt ${attempt}, delay ${Math.round(delayMs / 60000)} minutes`);

  return job;
}

/**
 * Get retry job status
 */
export async function getRetryJobStatus(smsId: string, attempt: number) {
  const jobId = `sms-${smsId}-attempt-${attempt}`;
  const job = await smsRetryQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Cancel a scheduled retry
 */
export async function cancelRetry(smsId: string, attempt: number) {
  const jobId = `sms-${smsId}-attempt-${attempt}`;
  const job = await smsRetryQueue.getJob(jobId);

  if (job) {
    await job.remove();
    console.log(`🚫 Cancelled retry for SMS ${smsId}, attempt ${attempt}`);
    return true;
  }

  return false;
}

/**
 * Initialize retry worker
 * This should be called once when the server starts
 */
export function initializeSMSRetryWorker() {
  const worker = new Worker<SMSRetryJob>(
    'sms-retry',
    async (job: Job<SMSRetryJob>) => {
      const { smsId, attempt, originalPhone, originalMessage } = job.data;

      console.log(`🔄 Processing SMS retry job: ${smsId}, attempt ${attempt}`);

      try {
        // Call the retry logic
        const success = await retrySMS(smsId, attempt);

        if (success) {
          console.log(`✅ SMS retry successful: ${smsId}`);
          return { success: true, smsId, attempt };
        } else {
          throw new Error('Retry failed');
        }
      } catch (error: any) {
        console.error(`❌ SMS retry job failed: ${smsId}`, error);
        throw error; // Let BullMQ handle the retry
      }
    },
    {
      connection,
      concurrency: 5, // Process 5 retry jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs per minute (rate limiting)
        duration: 60000,
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job: Job<SMSRetryJob>) => {
    console.log(`✅ Retry job completed: ${job.id}`);
  });

  worker.on('failed', (job: Job<SMSRetryJob> | undefined, error: Error) => {
    if (job) {
      console.error(`❌ Retry job failed: ${job.id}`, error);
    }
  });

  worker.on('error', (error: Error) => {
    console.error('❌ Retry worker error:', error);
  });

  console.log('🚀 SMS Retry Worker initialized');

  return worker;
}

/**
 * Initialize queue event listeners
 * Monitors queue events for debugging and analytics
 */
export function initializeSMSRetryEvents() {
  const queueEvents = new QueueEvents('sms-retry', { connection });

  queueEvents.on('completed', ({ jobId }) => {
    console.log(`📊 Job completed: ${jobId}`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.log(`📊 Job failed: ${jobId}, reason: ${failedReason}`);
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    console.log(`📊 Job progress: ${jobId}`, data);
  });

  console.log('📊 SMS Retry Queue Events initialized');

  return queueEvents;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    smsRetryQueue.getWaitingCount(),
    smsRetryQueue.getActiveCount(),
    smsRetryQueue.getCompletedCount(),
    smsRetryQueue.getFailedCount(),
    smsRetryQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clear all retry jobs (for testing/maintenance)
 */
export async function clearRetryQueue() {
  await smsRetryQueue.drain();
  await smsRetryQueue.clean(0, 1000, 'completed');
  await smsRetryQueue.clean(0, 1000, 'failed');
  console.log('🧹 Retry queue cleared');
}
