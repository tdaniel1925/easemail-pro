/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Production-ready health check for:
 * - Load balancers
 * - Uptime monitoring (UptimeRobot, Pingdom, etc.)
 * - Container orchestration (Kubernetes liveness/readiness probes)
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheck;
    redis?: HealthCheck;
  };
}

interface HealthCheck {
  status: 'ok' | 'error';
  message?: string;
  responseTime?: number;
}

export async function GET() {
  const startTime = Date.now();

  // Check database connectivity
  const dbCheck = await checkDatabase();

  // Determine overall health status
  const overallStatus =
    dbCheck.status === 'ok'
      ? 'healthy'
      : 'unhealthy';

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbCheck,
    },
  };

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Simple ping query
    await db.execute(sql`SELECT 1`);

    return {
      status: 'ok',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[Health Check] Database error:', error);

    return {
      status: 'error',
      message: 'Database connection failed',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Detailed health check endpoint (for admin/monitoring)
 * GET /api/health?detailed=true
 */
export async function HEAD() {
  // Lightweight check for load balancers
  try {
    await db.execute(sql`SELECT 1`);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
