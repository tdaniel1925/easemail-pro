/**
 * Usage Alert Checker
 * Checks current usage against alert thresholds and triggers notifications
 */

import { db } from '@/lib/db/drizzle';
import { usageAlerts, users, smsUsage, aiUsage, storageUsage } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';

interface AlertCheck {
  alert: any;
  currentValue: number;
  threshold: number;
  triggered: boolean;
}

export async function checkUsageAlerts(userId: string, organizationId?: string): Promise<AlertCheck[]> {
  // Get active alerts for user/org
  const alerts = await db.query.usageAlerts.findMany({
    where: and(
      organizationId
        ? eq(usageAlerts.organizationId, organizationId)
        : eq(usageAlerts.userId, userId),
      eq(usageAlerts.isActive, true)
    ),
  });

  const results: AlertCheck[] = [];

  for (const alert of alerts) {
    let currentValue = 0;
    const threshold = parseFloat(alert.thresholdValue || '0');

    // Get current month boundaries
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (alert.alertType) {
      case 'sms_messages':
        const smsRecords = await db.query.smsUsage.findMany({
          where: and(
            eq(smsUsage.userId, userId),
            gte(smsUsage.periodStart, periodStart)
          ),
        });
        currentValue = smsRecords.reduce((sum, r) => sum + (r.totalMessagesSent || 0), 0);
        break;

      case 'sms_cost':
        const smsC = await db.query.smsUsage.findMany({
          where: and(
            eq(smsUsage.userId, userId),
            gte(smsUsage.periodStart, periodStart)
          ),
        });
        currentValue = smsC.reduce((sum, r) => sum + parseFloat(r.totalChargedUsd || '0'), 0);
        break;

      case 'ai_requests':
        const aiRecords = await db.query.aiUsage.findMany({
          where: and(
            eq(aiUsage.userId, userId),
            gte(aiUsage.periodStart, periodStart)
          ),
        });
        currentValue = aiRecords.reduce((sum, r) => sum + (r.requestCount || 0), 0);
        break;

      case 'ai_cost':
        const aiC = await db.query.aiUsage.findMany({
          where: and(
            eq(aiUsage.userId, userId),
            gte(aiUsage.periodStart, periodStart)
          ),
        });
        currentValue = aiC.reduce((sum, r) => sum + parseFloat(r.totalCostUsd || '0'), 0);
        break;

      case 'storage_gb':
        const storageRecords = await db.query.storageUsage.findMany({
          where: and(
            eq(storageUsage.userId, userId),
            gte(storageUsage.periodStart, periodStart)
          ),
          orderBy: (su, { desc }) => [desc(su.snapshotDate)],
          limit: 1,
        });
        if (storageRecords.length > 0) {
          currentValue = Number(storageRecords[0].totalBytes || 0) / (1024 ** 3); // Convert to GB
        }
        break;

      case 'total_cost':
        // Calculate total cost across all usage types
        const smsT = await db.query.smsUsage.findMany({
          where: and(eq(smsUsage.userId, userId), gte(smsUsage.periodStart, periodStart)),
        });
        const aiT = await db.query.aiUsage.findMany({
          where: and(eq(aiUsage.userId, userId), gte(aiUsage.periodStart, periodStart)),
        });
        const storageT = await db.query.storageUsage.findMany({
          where: and(eq(storageUsage.userId, userId), gte(storageUsage.periodStart, periodStart)),
          orderBy: (su, { desc }) => [desc(su.snapshotDate)],
          limit: 1,
        });

        currentValue =
          smsT.reduce((sum, r) => sum + parseFloat(r.totalChargedUsd || '0'), 0) +
          aiT.reduce((sum, r) => sum + parseFloat(r.totalCostUsd || '0'), 0) +
          (storageT.length > 0 ? parseFloat(storageT[0].overageCostUsd || '0') : 0);
        break;
    }

    const triggered = currentValue >= threshold;

    results.push({
      alert,
      currentValue,
      threshold,
      triggered,
    });

    // If triggered and hasn't been triggered recently, send notification
    if (triggered && alert.notifyEmail) {
      const lastTriggered = alert.triggeredAt ? new Date(alert.triggeredAt) : null;
      const hoursSinceLastTrigger = lastTriggered
        ? (Date.now() - lastTriggered.getTime()) / (1000 * 60 * 60)
        : Infinity;

      // Only notify once every 24 hours
      if (hoursSinceLastTrigger > 24) {
        await sendAlertNotification(alert, currentValue, threshold);
        
        // Update last triggered timestamp
        await db
          .update(usageAlerts)
          .set({ 
            triggeredAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(usageAlerts.id, alert.id));
      }
    }
  }

  return results;
}

async function sendAlertNotification(alert: any, currentValue: number, threshold: number) {
  // Get user email
  const user = await db.query.users.findFirst({
    where: eq(users.id, alert.userId || alert.organizationId),
  });

  if (!user || !alert.notifyEmail) return;

  const alertTypeLabels: Record<string, string> = {
    sms_messages: 'SMS Messages',
    sms_cost: 'SMS Cost',
    ai_requests: 'AI Requests',
    ai_cost: 'AI Cost',
    storage_gb: 'Storage (GB)',
    total_cost: 'Total Cost',
  };

  const subject = `Usage Alert: ${alertTypeLabels[alert.alertType] || alert.alertType} threshold reached`;
  const body = `
    Hello ${user.fullName || user.email},

    Your ${alertTypeLabels[alert.alertType] || alert.alertType} usage has reached the alert threshold.

    Current Value: ${currentValue.toFixed(2)}
    Threshold: ${threshold}

    Please review your usage in the dashboard.

    Best regards,
    EaseMail Team
  `;

  // TODO: Implement actual email sending via your email service
  console.log('📧 Alert notification:', { to: alert.notifyEmail, subject, body });
}

/**
 * Check all active alerts (can be called by a cron job)
 */
export async function checkAllUsageAlerts() {
  const alerts = await db.query.usageAlerts.findMany({
    where: eq(usageAlerts.isActive, true),
  });

  const results = [];

  for (const alert of alerts) {
    const userId = alert.userId || '';
    const orgId = alert.organizationId || undefined;
    
    if (userId) {
      const alertChecks = await checkUsageAlerts(userId, orgId);
      results.push(...alertChecks);
    }
  }

  return results;
}

