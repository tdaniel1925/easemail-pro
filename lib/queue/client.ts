/**
 * BullMQ Job Queue System
 * Production-grade job queue with Redis backing
 */

import { Queue, Worker, QueueEvents, ConnectionOptions } from 'bullmq';
import { getIORedisClient } from '../redis/client';

// Redis connection configuration for BullMQ
function getRedisConnection(): ConnectionOptions {
  if (process.env.REDIS_PROVIDER === 'upstash' && process.env.UPSTASH_REDIS_REST_URL) {
    // Extract host and port from Upstash URL
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      tls: url.protocol === 'https:' ? {} : undefined,
    };
  }

  // Local or standard Redis
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || undefined,
  };
}

/**
 * Queue names for different job types
 */
export enum QueueName {
  EMAIL_SYNC = 'email-sync',
  EMAIL_SEND = 'email-send',
  EMAIL_SCHEDULED = 'email-scheduled',
  SMS_SEND = 'sms-send',
  WEBHOOK_PROCESS = 'webhook-process',
  AI_PROCESSING = 'ai-processing',
  SEARCH_INDEX = 'search-index',
  BILLING = 'billing',
  EMAIL_CLEANUP = 'email-cleanup',
}

/**
 * Job data interfaces
 */
export interface EmailSyncJob {
  accountId: string;
  fullSync?: boolean;
  fromDate?: string;
}

export interface EmailSendJob {
  draftId: string;
  userId: string;
  accountId: string;
}

export interface ScheduledEmailJob {
  draftId: string;
  userId: string;
  accountId: string;
  scheduledAt: Date;
}

export interface SMSSendJob {
  to: string;
  message: string;
  contactId?: string;
  userId: string;
}

export interface WebhookProcessJob {
  payload: any;
  provider: 'nylas' | 'twilio';
  signature: string;
}

export interface AIProcessingJob {
  emailId: string;
  task: 'summary' | 'sentiment' | 'category' | 'action_items';
}

export interface SearchIndexJob {
  emailId: string;
  action: 'index' | 'update' | 'delete';
}

export interface BillingJob {
  type: 'daily' | 'weekly' | 'monthly';
  organizationId?: string;
}

/**
 * Create a queue instance
 */
export function createQueue(queueName: QueueName): Queue {
  return new Queue(queueName, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });
}

/**
 * Create a worker to process jobs
 */
export function createWorker(
  queueName: QueueName,
  processor: (job: any) => Promise<any>
): Worker {
  return new Worker(queueName, processor, {
    connection: getRedisConnection(),
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000, // Per minute
    },
  });
}

/**
 * Create queue events listener for monitoring
 */
export function createQueueEvents(queueName: QueueName): QueueEvents {
  return new QueueEvents(queueName, {
    connection: getRedisConnection(),
  });
}

/**
 * Queue Management Utilities
 */
export const queueManager = {
  /**
   * Add a job to a queue
   */
  async addJob(
    queueName: QueueName,
    jobName: string,
    data: any,
    options?: {
      priority?: number;
      delay?: number;
      repeat?: {
        pattern?: string; // Cron pattern
        every?: number; // Milliseconds
      };
    }
  ) {
    const queue = createQueue(queueName);

    return await queue.add(jobName, data, {
      priority: options?.priority,
      delay: options?.delay,
      repeat: options?.repeat,
    });
  },

  /**
   * Get job counts for a queue
   */
  async getJobCounts(queueName: QueueName) {
    const queue = createQueue(queueName);
    return await queue.getJobCounts();
  },

  /**
   * Get all jobs in a specific state
   */
  async getJobs(queueName: QueueName, state: 'completed' | 'failed' | 'active' | 'waiting') {
    const queue = createQueue(queueName);

    switch (state) {
      case 'completed':
        return await queue.getCompleted();
      case 'failed':
        return await queue.getFailed();
      case 'active':
        return await queue.getActive();
      case 'waiting':
        return await queue.getWaiting();
    }
  },

  /**
   * Clean old jobs from queue
   */
  async cleanJobs(queueName: QueueName, age: number, status: 'completed' | 'failed') {
    const queue = createQueue(queueName);
    return await queue.clean(age, 1000, status);
  },

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName) {
    const queue = createQueue(queueName);
    await queue.pause();
  },

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName) {
    const queue = createQueue(queueName);
    await queue.resume();
  },

  /**
   * Get queue metrics
   */
  async getMetrics(queueName: QueueName) {
    const queue = createQueue(queueName);
    const counts = await queue.getJobCounts();
    const isPaused = await queue.isPaused();

    return {
      queueName,
      isPaused,
      ...counts,
    };
  },
};
