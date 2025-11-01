/**
 * SMS Audit and Privacy Services
 * GDPR/CCPA compliance, audit trail, and data management
 */

import { db } from '@/lib/db/drizzle';
import { smsMessages, contactCommunications, contacts, smsAuditLog } from '@/lib/db/schema';
import { eq, lt, sql } from 'drizzle-orm';

/**
 * Log SMS audit event
 * Creates audit trail for billing disputes and compliance
 */
export interface AuditLogEntry {
  userId: string;
  smsId?: string;
  action: string;
  amountCharged?: number;
  amountRefunded?: number;
  invoiceId?: string;
  receiptUrl?: string;
  metadata?: Record<string, any>;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logSMSAudit(entry: AuditLogEntry) {
  try {
    // Insert into actual audit log table
    await db.insert(smsAuditLog).values({
      userId: entry.userId,
      smsId: entry.smsId || null,
      action: entry.action,
      amountCharged: entry.amountCharged?.toString() || null,
      metadata: entry.metadata || {},
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
    });

    console.log('📝 Audit log saved:', entry.action);
  } catch (error) {
    console.error('❌ Audit log error:', error);
    // Don't throw - audit failures shouldn't break SMS sending
  }
}

/**
 * Generate SMS receipt for billing
 */
export async function generateSMSReceipt(smsId: string): Promise<string> {
  const sms = await db.query.smsMessages.findFirst({
    where: eq(smsMessages.id, smsId),
  });

  if (!sms) throw new Error('SMS not found');

  const receipt = {
    receiptNumber: `SMS-${smsId.slice(0, 8).toUpperCase()}`,
    date: sms.createdAt,
    to: sms.toPhone,
    message: sms.messageBody.substring(0, 50) + (sms.messageBody.length > 50 ? '...' : ''),
    status: sms.twilioStatus,
    cost: parseFloat(sms.priceChargedUsd || '0'),
    twilioSid: sms.twilioSid,
    userId: sms.userId,
  };

  // In production, generate PDF or store in cloud storage
  return JSON.stringify(receipt, null, 2);
}

/**
 * GDPR: Anonymize user SMS data (Right to be Forgotten)
 */
export async function anonymizeUserSMSData(userId: string): Promise<void> {
  console.log('🔒 Anonymizing SMS data for user:', userId);

  try {
    // Anonymize SMS messages
    await db.update(smsMessages)
      .set({
        toPhone: '[REDACTED]',
        fromPhone: '[REDACTED]',
        messageBody: '[MESSAGE DELETED PER USER REQUEST]',
        twilioSid: null,
        updatedAt: new Date(),
      })
      .where(eq(smsMessages.userId, userId));

    // Anonymize communications
    await db.update(contactCommunications)
      .set({
        body: '[DELETED]',
        snippet: '[DELETED]',
        updatedAt: new Date(),
      })
      .where(eq(contactCommunications.userId, userId));

    console.log('✅ SMS data anonymized for user:', userId);
  } catch (error) {
    console.error('❌ Anonymization error:', error);
    throw error;
  }
}

/**
 * GDPR: Export user data (Data Portability)
 */
export async function exportUserSMSData(userId: string): Promise<object> {
  const messages = await db.query.smsMessages.findMany({
    where: eq(smsMessages.userId, userId),
  });

  return {
    exportDate: new Date().toISOString(),
    userId,
    totalMessages: messages.length,
    messages: messages.map(m => ({
      id: m.id,
      to: m.toPhone,
      from: m.fromPhone,
      message: m.messageBody,
      status: m.twilioStatus,
      cost: m.priceChargedUsd,
      sentAt: m.sentAt,
      createdAt: m.createdAt,
    })),
  };
}

/**
 * Data retention policy
 * Delete SMS older than specified days (default 90)
 */
export async function applyDataRetentionPolicy(days: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db.delete(smsMessages)
      .where(lt(smsMessages.createdAt, cutoffDate));

    const deletedCount = 0; // result.rowCount not available in all DB drivers
    console.log(`🗑️ Applied data retention: deleted SMS messages older than ${days} days`);
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Data retention error:', error);
    return 0;
  }
}

/**
 * Check SMS consent for contact
 */
export async function checkSMSConsent(contactId: string): Promise<boolean> {
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  // Check customFields for SMS consent
  if (contact?.customFields && typeof contact.customFields === 'object') {
    return (contact.customFields as any).smsConsent === true;
  }

  // Default: no consent
  return false;
}

/**
 * Record SMS consent
 */
export async function recordSMSConsent(contactId: string, consented: boolean): Promise<void> {
  await db.update(contacts)
    .set({
      customFields: sql`jsonb_set(COALESCE(custom_fields, '{}'), '{smsConsent}', '${consented}')`,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

  console.log(`✅ SMS consent ${consented ? 'granted' : 'revoked'} for contact:`, contactId);
}

/**
 * Privacy-safe SMS display (mask phone numbers)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Show only last 4 digits: +1 (***) ***-1234
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    const lastFour = digits.slice(-4);
    return `***-***-${lastFour}`;
  }
  return '***-***-****';
}

