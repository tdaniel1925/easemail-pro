/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at build/startup time
 * Prevents deployment with missing or invalid configuration
 */

import { z } from 'zod';

// Environment schema with all required variables
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Nylas API
  NYLAS_CLIENT_ID: z.string().min(1, 'NYLAS_CLIENT_ID is required'),
  NYLAS_API_KEY: z.string().min(1, 'NYLAS_API_KEY is required'),
  NYLAS_API_URI: z.string().url('NYLAS_API_URI must be a valid URL'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Upstash Redis (for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL').optional(),

  // Admin Setup (critical for first-time setup)
  ADMIN_SETUP_TOKEN: z.string().min(32, 'ADMIN_SETUP_TOKEN must be at least 32 characters for security'),

  // Optional: Stripe (warn if not configured)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

// Subset for optional/recommended variables
const optionalEnvSchema = z.object({
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),

  // Stripe (payment processing)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;
export type OptionalEnvConfig = z.infer<typeof optionalEnvSchema>;

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingOptional: string[];
}

/**
 * Validate environment variables
 * Call this at app startup (in instrumentation.ts or root layout)
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingOptional: string[] = [];

  try {
    // Validate required variables
    envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      }));
    }
  }

  // Check optional variables
  const optionalVars = [
    'SENTRY_DSN',
    'SENTRY_AUTH_TOKEN',
    'NEXT_PUBLIC_GA_ID',
    'NEXT_PUBLIC_POSTHOG_KEY',
  ];

  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  });

  // Check Stripe configuration (warn if incomplete)
  const stripeVars = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const stripeConfigured = stripeVars.filter(v => process.env[v]).length;

  if (stripeConfigured > 0 && stripeConfigured < stripeVars.length) {
    warnings.push(`Stripe is partially configured. Missing: ${stripeVars.filter(v => !process.env[v]).join(', ')}`);
  } else if (stripeConfigured === 0) {
    warnings.push('Stripe is not configured - payment processing will be unavailable');
  }

  // Check if admin setup token is secure
  const adminToken = process.env.ADMIN_SETUP_TOKEN;
  if (adminToken && adminToken.length < 32) {
    warnings.push('ADMIN_SETUP_TOKEN should be at least 32 characters for production security');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingOptional,
  };
}

/**
 * Get validated environment config (throws if invalid)
 */
export function getEnvConfig(): EnvConfig {
  return envSchema.parse(process.env);
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  console.log('\n🔍 Environment Variable Validation\n');

  if (result.valid) {
    console.log('✅ All required environment variables are valid\n');
  } else {
    console.error('❌ Environment validation failed!\n');
    console.error('Errors:');
    result.errors.forEach(err => console.error(`  - ${err}`));
    console.error('\n');
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    result.warnings.forEach(warn => console.warn(`  - ${warn}`));
    console.warn('\n');
  }

  if (result.missingOptional.length > 0 && process.env.NODE_ENV === 'production') {
    console.log('ℹ️  Optional (recommended for production):');
    result.missingOptional.forEach(opt => console.log(`  - ${opt}`));
    console.log('\n');
  }
}

/**
 * Validate and exit if invalid (for build/startup scripts)
 */
export function validateEnvOrExit(): void {
  const result = validateEnv();
  printValidationResults(result);

  if (!result.valid) {
    console.error('💥 Deployment cannot proceed with invalid environment configuration');
    process.exit(1);
  }
}
