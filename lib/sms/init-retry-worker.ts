/**
 * SMS Retry Worker Initialization
 * Import this file once at server startup to initialize the retry worker
 *
 * Usage in Next.js:
 * - For development: Import in instrumentation.ts
 * - For production: Import in root layout or middleware
 */

import { initializeSMSRetryWorker, initializeSMSRetryEvents } from './retry-queue';

let workerInitialized = false;
let eventsInitialized = false;

/**
 * Initialize SMS retry worker
 * Safe to call multiple times (will only initialize once)
 */
export function initSMSRetrySystem() {
  // Prevent multiple initializations
  if (workerInitialized && eventsInitialized) {
    console.log('⏭️  SMS Retry System already initialized');
    return;
  }

  try {
    // Initialize worker if not already done
    if (!workerInitialized) {
      initializeSMSRetryWorker();
      workerInitialized = true;
    }

    // Initialize events if not already done
    if (!eventsInitialized) {
      initializeSMSRetryEvents();
      eventsInitialized = true;
    }

    console.log('✅ SMS Retry System initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize SMS Retry System:', error);
    // Don't throw - allow app to start even if retry system fails
  }
}

// Auto-initialize if this module is imported
// Only in Node.js environment (not during build)
if (typeof window === 'undefined') {
  // Check if we're in a development or production runtime (not build time)
  if (process.env.NODE_ENV !== 'test' && !process.env.BUILDING) {
    initSMSRetrySystem();
  }
}
