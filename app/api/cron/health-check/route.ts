/**
 * Automated Health Check Cron Job
 *
 * Runs every 5 minutes to check system health and send alerts if issues detected.
 * Called by Vercel Cron (see vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database?: { status: string; latency?: number };
    environment?: { status: string };
  };
}

/**
 * Send alert to Slack webhook
 */
async function sendSlackAlert(health: HealthCheckResult): Promise<void> {
  const webhookUrl = process.env.SLACK_ALERTS_WEBHOOK;

  if (!webhookUrl) {
    console.warn('SLACK_ALERTS_WEBHOOK not configured - skipping Slack notification');
    return;
  }

  const color = health.status === 'unhealthy' ? 'danger' : 'warning';
  const emoji = health.status === 'unhealthy' ? '🔴' : '⚠️';

  const message = {
    attachments: [
      {
        color,
        title: `${emoji} Health Check Alert`,
        text: `System status: *${health.status.toUpperCase()}*`,
        fields: [
          {
            title: 'Database',
            value: health.checks.database?.status || 'unknown',
            short: true,
          },
          {
            title: 'Environment',
            value: health.checks.environment?.status || 'unknown',
            short: true,
          },
          {
            title: 'Timestamp',
            value: new Date(health.timestamp).toLocaleString(),
            short: false,
          },
        ],
        footer: 'EaseMail Health Monitor',
        footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Failed to send Slack alert:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Slack alert:', error);
  }
}

/**
 * Send alert email
 */
async function sendEmailAlert(health: HealthCheckResult): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL || 'alerts@easemail.com';

  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured - skipping email notification');
    return;
  }

  const subject = `[${health.status.toUpperCase()}] EaseMail Health Check Alert`;
  const body = `
    <h2>Health Check Alert</h2>
    <p><strong>Status:</strong> ${health.status.toUpperCase()}</p>
    <p><strong>Timestamp:</strong> ${new Date(health.timestamp).toLocaleString()}</p>

    <h3>System Checks:</h3>
    <ul>
      <li><strong>Database:</strong> ${health.checks.database?.status || 'unknown'}
        ${health.checks.database?.latency ? `(${health.checks.database.latency}ms)` : ''}
      </li>
      <li><strong>Environment:</strong> ${health.checks.environment?.status || 'unknown'}</li>
    </ul>

    <p>Please check the <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/health">health endpoint</a> for more details.</p>

    <hr>
    <p><small>This is an automated alert from EaseMail Health Monitor</small></p>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'EaseMail Alerts <alerts@easemail.com>',
        to: [alertEmail],
        subject,
        html: body,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send email alert:', await response.text());
    }
  } catch (error) {
    console.error('Error sending email alert:', error);
  }
}

/**
 * Log health check result to Sentry
 */
function logToSentry(health: HealthCheckResult): void {
  // Only log degraded or unhealthy states
  if (health.status === 'healthy') {
    return;
  }

  // @ts-ignore - Sentry may not be available in all environments
  if (typeof Sentry !== 'undefined') {
    const level = health.status === 'unhealthy' ? 'error' : 'warning';
    // @ts-ignore
    Sentry.captureMessage(`Health check ${health.status}`, {
      level,
      extra: {
        checks: health.checks,
        timestamp: health.timestamp,
      },
      tags: {
        health_status: health.status,
      },
    });
  }
}

/**
 * Cron job handler
 * Secured with CRON_SECRET to prevent unauthorized access
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized health check cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch health endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const healthUrl = `${baseUrl}/api/health`;

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'EaseMail-Health-Monitor/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Health endpoint returned ${response.status}`);
      return NextResponse.json(
        {
          checked: true,
          status: 'unhealthy',
          error: `Health endpoint returned ${response.status}`,
        },
        { status: 200 }
      );
    }

    const health: HealthCheckResult = await response.json();

    console.log(`Health check completed: ${health.status}`);

    // Send alerts if not healthy
    if (health.status !== 'healthy') {
      console.warn(`System ${health.status} - sending alerts`);

      // Send alerts in parallel
      await Promise.allSettled([
        sendSlackAlert(health),
        sendEmailAlert(health),
      ]);

      // Log to Sentry
      logToSentry(health);
    }

    return NextResponse.json({
      checked: true,
      status: health.status,
      timestamp: health.timestamp,
      alerts_sent: health.status !== 'healthy',
    });

  } catch (error) {
    console.error('Health check cron job failed:', error);

    // Send critical alert about monitoring failure
    const criticalHealth: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {},
    };

    await Promise.allSettled([
      sendSlackAlert(criticalHealth),
      sendEmailAlert(criticalHealth),
    ]);

    return NextResponse.json(
      {
        checked: true,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
