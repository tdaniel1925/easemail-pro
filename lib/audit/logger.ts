/**
 * Audit Logger Utility
 * Helper functions to log audit events
 */

import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.password_changed'
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.voided'
  | 'payment_method.added'
  | 'payment_method.removed'
  | 'payment_method.set_default'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'alert.created'
  | 'alert.updated'
  | 'alert.deleted'
  | 'alert.triggered'
  | 'report.generated'
  | 'member.invited'
  | 'member.removed'
  | 'member.role_changed'
  | 'settings.updated';

interface AuditLogData {
  userId: string;
  organizationId?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event
 */
export async function logAudit(data: AuditLogData) {
  try {
    await db.insert(auditLogs).values({
      userId: data.userId,
      organizationId: data.organizationId || null,
      action: data.action,
      resourceType: data.resourceType || null,
      resourceId: data.resourceId || null,
      oldValue: data.oldValue as any,
      newValue: data.newValue as any,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata as any,
    });

    console.log('✅ Audit log created:', data.action, data.resourceType);
  } catch (error) {
    console.error('❌ Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Helper functions for common audit events
 */

export async function logUserLogin(userId: string, ipAddress?: string, userAgent?: string) {
  return logAudit({
    userId,
    action: 'user.login',
    ipAddress,
    userAgent,
  });
}

export async function logInvoiceCreated(
  userId: string,
  organizationId: string | null,
  invoiceId: string,
  amount: number
) {
  return logAudit({
    userId,
    organizationId,
    action: 'invoice.created',
    resourceType: 'invoice',
    resourceId: invoiceId,
    newValue: { amount },
  });
}

export async function logInvoicePaid(
  userId: string,
  organizationId: string | null,
  invoiceId: string,
  amount: number,
  paymentMethod?: string
) {
  return logAudit({
    userId,
    organizationId,
    action: 'invoice.paid',
    resourceType: 'invoice',
    resourceId: invoiceId,
    newValue: { amount, paymentMethod },
  });
}

export async function logPaymentMethodAdded(
  userId: string,
  organizationId: string | null,
  methodId: string,
  type: string,
  lastFour?: string
) {
  return logAudit({
    userId,
    organizationId,
    action: 'payment_method.added',
    resourceType: 'payment_method',
    resourceId: methodId,
    newValue: { type, lastFour },
  });
}

export async function logAlertTriggered(
  userId: string,
  organizationId: string | null,
  alertId: string,
  alertType: string,
  currentValue: number,
  threshold: number
) {
  return logAudit({
    userId,
    organizationId,
    action: 'alert.triggered',
    resourceType: 'usage_alert',
    resourceId: alertId,
    metadata: {
      alertType,
      currentValue,
      threshold,
    },
  });
}

export async function logMemberInvited(
  userId: string,
  organizationId: string,
  invitedEmail: string,
  role: string
) {
  return logAudit({
    userId,
    organizationId,
    action: 'member.invited',
    resourceType: 'team_member',
    newValue: { email: invitedEmail, role },
  });
}

export async function logMemberRoleChanged(
  userId: string,
  organizationId: string,
  memberId: string,
  oldRole: string,
  newRole: string
) {
  return logAudit({
    userId,
    organizationId,
    action: 'member.role_changed',
    resourceType: 'team_member',
    resourceId: memberId,
    oldValue: { role: oldRole },
    newValue: { role: newRole },
  });
}

export async function logReportGenerated(
  userId: string,
  organizationId: string | null,
  reportType: string,
  format: string
) {
  return logAudit({
    userId,
    organizationId,
    action: 'report.generated',
    resourceType: 'report',
    metadata: { reportType, format },
  });
}

