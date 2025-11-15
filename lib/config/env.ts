/**
 * Centralized Environment Variable Validation
 *
 * ✅ SECURITY: This file ensures all required environment variables are present
 * and properly formatted before the application starts.
 *
 * Benefits:
 * - Type-safe access to environment variables
 * - Early failure on missing/invalid configuration
 * - Self-documenting list of required variables
 * - Prevents runtime errors due to missing env vars
 *
 * Usage:
 * import { config } from '@/lib/config/env';
 * const apiKey = config.OPENAI_API_KEY; // Type-safe and validated
 */

import { z } from 'zod';

/**
 * Environment variable schema with validation rules
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Email Providers
  NYLAS_API_KEY: z.string().min(1),
  NYLAS_API_URI: z.string().url(),
  NYLAS_CLIENT_ID: z.string().min(1),
  NYLAS_CLIENT_SECRET: z.string().min(1),
  NYLAS_WEBHOOK_SECRET: z.string().min(1).optional(), // Optional in dev

  AURINKO_API_URL: z.string().url().optional(),
  AURINKO_CLIENT_ID: z.string().optional(),
  AURINKO_CLIENT_SECRET: z.string().optional(),

  // AI & APIs
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Payments
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // Email Sending
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  EMAIL_ENCRYPTION_KEY: z.string().min(32).optional(),

  // Webhooks & Security
  WEBHOOK_SECRET: z.string().min(32).optional(),

  // Optional Development/Debug
  DISABLE_WEBHOOK_VERIFICATION: z.enum(['true', 'false']).optional(),

  // Monitoring
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

/**
 * Validated and typed environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws an error if validation fails
 */
function validateEnv(): Env {
  try {
    const validated = envSchema.parse(process.env);

    // ✅ SECURITY: Additional production checks
    if (validated.NODE_ENV === 'production') {
      // Critical secrets must be present in production
      const requiredInProduction = [
        'NYLAS_WEBHOOK_SECRET',
        'WEBHOOK_SECRET',
        'EMAIL_ENCRYPTION_KEY',
      ] as const;

      const missing = requiredInProduction.filter(
        key => !process.env[key]
      );

      if (missing.length > 0) {
        throw new Error(
          `❌ CRITICAL: The following environment variables are required in production: ${missing.join(', ')}`
        );
      }

      // Warn about optional but recommended variables
      const recommended = [
        'OPENAI_API_KEY',
        'STRIPE_SECRET_KEY',
        'TWILIO_ACCOUNT_SID',
        'RESEND_API_KEY',
      ] as const;

      const missingRecommended = recommended.filter(
        key => !process.env[key]
      );

      if (missingRecommended.length > 0) {
        console.warn(
          `⚠️  The following optional environment variables are not set: ${missingRecommended.join(', ')}`
        );
      }
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
      throw new Error('Invalid environment variables. Please check your .env file.');
    }
    throw error;
  }
}

/**
 * Validated configuration object
 * Use this instead of process.env for type safety
 */
export const config = validateEnv();

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof Env): boolean {
  return !!config[feature];
}

/**
 * Helper to check if we're in production
 */
export const isProduction = config.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDevelopment = config.NODE_ENV === 'development';

/**
 * Helper to check if we're in test
 */
export const isTest = config.NODE_ENV === 'test';
