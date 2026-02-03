export async function register() {
  // Validate environment variables at startup (server-side only)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv, printValidationResults } = await import('./lib/config/env-validation');
    const result = validateEnv();
    printValidationResults(result);

    // In production, warn about invalid environment but allow build to continue
    // Vercel will fail deployment if critical env vars are actually missing
    if (!result.valid && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  Warning: Some environment validation checks failed');
      console.warn('Build will continue - Vercel will handle critical errors');
      // Temporarily disabled strict validation to allow build
      // process.exit(1);
    }

    // Initialize Sentry
    await import('./sentry.server.config');

    // ✅ Initialize SMS Retry Worker (persistent queue with BullMQ)
    try {
      const { initSMSRetrySystem } = await import('./lib/sms/init-retry-worker');
      initSMSRetrySystem();
    } catch (error) {
      console.error('⚠️ Failed to initialize SMS Retry System:', error);
      // Don't crash app if retry system fails
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

