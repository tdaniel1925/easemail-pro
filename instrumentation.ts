export async function register() {
  // Validate environment variables at startup (server-side only)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv, printValidationResults } = await import('./lib/config/env-validation');
    const result = validateEnv();
    printValidationResults(result);

    // In production, fail fast if environment is invalid
    if (!result.valid && process.env.NODE_ENV === 'production') {
      console.error('💥 Production deployment halted due to invalid environment configuration');
      process.exit(1);
    }

    // Initialize Sentry
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

