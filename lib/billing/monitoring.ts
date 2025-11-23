/**
 * Billing Monitoring & Alerting System
 *
 * Monitors billing operations and sends alerts for failures
 */

import { db } from '@/lib/db/drizzle';
import { billingRuns, billingTransactions, users } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { sendBillingRunNotification } from './email-notifications';

export interface BillingHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastBillingRun: {
    id: string;
    status: string;
    accountsProcessed: number;
    chargesSuccessful: number;
    chargesFailed: number;
    totalAmountChargedUsd: string;
    completedAt: Date | null;
  } | null;
  failedTransactions24h: number;
  failedTransactions7d: number;
  revenueToday: number;
  revenueThisMonth: number;
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Get billing system health status
 */
export async function getBillingHealth(): Promise<BillingHealth> {
  const alerts: BillingHealth['alerts'] = [];
  const now = new Date();

  // Get last billing run
  const lastRun = await db.query.billingRuns.findFirst({
    orderBy: [desc(billingRuns.completedAt)],
  });

  // Get failed transactions in last 24 hours
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const failedTransactions24h = await db.query.billingTransactions.findMany({
    where: and(
      eq(billingTransactions.status, 'failed'),
      gte(billingTransactions.createdAt, last24h)
    ),
  });

  // Get failed transactions in last 7 days
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const failedTransactions7d = await db.query.billingTransactions.findMany({
    where: and(
      eq(billingTransactions.status, 'failed'),
      gte(billingTransactions.createdAt, last7d)
    ),
  });

  // Calculate revenue today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const successfulToday = await db.query.billingTransactions.findMany({
    where: and(
      eq(billingTransactions.status, 'success'),
      gte(billingTransactions.createdAt, startOfDay)
    ),
  });
  const revenueToday = successfulToday.reduce(
    (sum, tx) => sum + parseFloat(tx.amountUsd),
    0
  );

  // Calculate revenue this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const successfulThisMonth = await db.query.billingTransactions.findMany({
    where: and(
      eq(billingTransactions.status, 'success'),
      gte(billingTransactions.createdAt, startOfMonth)
    ),
  });
  const revenueThisMonth = successfulThisMonth.reduce(
    (sum, tx) => sum + parseFloat(tx.amountUsd),
    0
  );

  // Generate alerts based on thresholds
  let status: BillingHealth['status'] = 'healthy';

  // Check last billing run
  if (!lastRun) {
    alerts.push({
      severity: 'warning',
      message: 'No billing runs found in the system',
      timestamp: now,
    });
    status = 'warning';
  } else if (lastRun.status === 'failed') {
    alerts.push({
      severity: 'critical',
      message: `Last billing run failed: ${lastRun.errorMessage || 'Unknown error'}`,
      timestamp: lastRun.completedAt || now,
    });
    status = 'critical';
  } else if (lastRun.chargesFailed > 0) {
    const failureRate = (lastRun.chargesFailed / lastRun.accountsProcessed) * 100;
    if (failureRate > 50) {
      alerts.push({
        severity: 'critical',
        message: `High failure rate: ${failureRate.toFixed(1)}% (${lastRun.chargesFailed}/${lastRun.accountsProcessed} failed)`,
        timestamp: lastRun.completedAt || now,
      });
      status = 'critical';
    } else if (failureRate > 20) {
      alerts.push({
        severity: 'warning',
        message: `Elevated failure rate: ${failureRate.toFixed(1)}% (${lastRun.chargesFailed}/${lastRun.accountsProcessed} failed)`,
        timestamp: lastRun.completedAt || now,
      });
      if (status !== 'critical') status = 'warning';
    }
  }

  // Check recent failed transactions
  if (failedTransactions24h.length > 10) {
    alerts.push({
      severity: 'critical',
      message: `${failedTransactions24h.length} failed transactions in the last 24 hours`,
      timestamp: now,
    });
    status = 'critical';
  } else if (failedTransactions24h.length > 5) {
    alerts.push({
      severity: 'warning',
      message: `${failedTransactions24h.length} failed transactions in the last 24 hours`,
      timestamp: now,
    });
    if (status !== 'critical') status = 'warning';
  }

  // Check for stale billing run
  if (lastRun && lastRun.completedAt) {
    const hoursSinceLastRun = (now.getTime() - lastRun.completedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastRun > 48) {
      alerts.push({
        severity: 'warning',
        message: `No billing run in ${Math.floor(hoursSinceLastRun)} hours`,
        timestamp: now,
      });
      if (status !== 'critical') status = 'warning';
    }
  }

  // Positive alerts
  if (status === 'healthy' && revenueToday > 0) {
    alerts.push({
      severity: 'info',
      message: `Generated $${revenueToday.toFixed(2)} in revenue today`,
      timestamp: now,
    });
  }

  return {
    status,
    lastBillingRun: lastRun,
    failedTransactions24h: failedTransactions24h.length,
    failedTransactions7d: failedTransactions7d.length,
    revenueToday,
    revenueThisMonth,
    alerts,
  };
}

/**
 * Send alert notification for critical billing issues
 */
export async function sendBillingAlert(
  severity: 'info' | 'warning' | 'critical',
  message: string,
  details?: Record<string, any>
): Promise<void> {
  // Get admin email from billing config
  const { getBillingConfig } = await import('./automated-billing');
  const config = await getBillingConfig();

  if (!config || !config.notificationEmail) {
    console.warn('⚠️  No notification email configured for billing alerts');
    return;
  }

  // Send alert via email
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const severityColors = {
    info: '#3b82f6',
    warning: '#f59e0b',
    critical: '#dc2626',
  };

  const severityEmojis = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${severityColors[severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .alert { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${severityColors[severity]}; }
        .details { background: white; padding: 15px; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${severityEmojis[severity]} Billing Alert: ${severity.toUpperCase()}</h1>
          <p style="margin: 5px 0 0 0;">${new Date().toLocaleString()}</p>
        </div>
        <div class="content">
          <div class="alert">
            <p style="margin: 0; font-size: 16px;"><strong>${message}</strong></p>
          </div>

          ${details ? `
            <div class="details">
              <h3 style="margin-top: 0;">Details:</h3>
              <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(details, null, 2)}</pre>
            </div>
          ` : ''}

          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/billing-config"
               style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Billing Dashboard
            </a>
          </p>
        </div>
        <div class="footer">
          <p>EaseMail Automated Billing System</p>
          <p>This is an automated alert from the billing monitoring system</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: 'EaseMail Billing Alerts <alerts@easemail.app>',
      to: config.notificationEmail,
      subject: `${severityEmojis[severity]} Billing Alert: ${severity.toUpperCase()} - ${message}`,
      html,
    });

    console.log(`✅ Billing alert sent: ${severity} - ${message}`);
  } catch (error) {
    console.error('Failed to send billing alert:', error);
  }
}

/**
 * Check billing health and send alerts if needed
 * This should be called periodically (e.g., every hour)
 */
export async function monitorBillingHealth(): Promise<void> {
  const health = await getBillingHealth();

  // Send alert if status is warning or critical
  if (health.status === 'critical') {
    const criticalAlerts = health.alerts.filter(a => a.severity === 'critical');
    for (const alert of criticalAlerts) {
      await sendBillingAlert('critical', alert.message, {
        lastBillingRun: health.lastBillingRun,
        failedTransactions24h: health.failedTransactions24h,
      });
    }
  } else if (health.status === 'warning') {
    const warningAlerts = health.alerts.filter(a => a.severity === 'warning');
    // Only send one summary alert for warnings to avoid spam
    if (warningAlerts.length > 0) {
      await sendBillingAlert(
        'warning',
        `${warningAlerts.length} billing warning(s) detected`,
        {
          warnings: warningAlerts.map(a => a.message),
          lastBillingRun: health.lastBillingRun,
          failedTransactions24h: health.failedTransactions24h,
        }
      );
    }
  }
}
