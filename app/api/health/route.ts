/**
 * Health Check Endpoint
 *
 * Used for monitoring, load balancers, and uptime checks
 * Returns application health status and basic metrics
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    environment: {
      status: 'ok' | 'warning';
      missing?: string[];
    };
  };
}

// Required environment variables for production
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NYLAS_API_KEY',
  'NYLAS_CLIENT_ID',
  'NYLAS_CLIENT_SECRET',
];

/**
 * GET /api/health
 *
 * Returns health status of the application
 * Used by monitoring services and load balancers
 */
export async function GET() {
  const startTime = Date.now();

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'ok'
      },
      environment: {
        status: 'ok'
      }
    }
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1 as health_check`);
    const dbLatency = Date.now() - dbStart;

    health.checks.database = {
      status: 'ok',
      latency: dbLatency
    };

    // Warn if database is slow
    if (dbLatency > 1000) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }

  // Check required environment variables
  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    health.status = 'degraded';
    health.checks.environment = {
      status: 'warning',
      missing: missingVars
    };
  }

  // Return appropriate status code
  const statusCode =
    health.status === 'healthy' ? 200 :
    health.status === 'degraded' ? 200 : // Still return 200 for degraded
    503; // Unhealthy

  return NextResponse.json(health, { status: statusCode });
}

/**
 * HEAD /api/health
 *
 * Lightweight health check (no body)
 * Returns 200 if healthy, 503 if unhealthy
 */
export async function HEAD() {
  try {
    // Quick database ping
    await db.execute(sql`SELECT 1`);

    // Check critical env vars
    const hasCriticalVars = ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'].every(
      v => !!process.env[v]
    );

    if (!hasCriticalVars) {
      return new NextResponse(null, { status: 503 });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
