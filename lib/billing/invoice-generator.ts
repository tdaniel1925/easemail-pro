/**
 * Invoice Generation System
 * Handles creating, calculating, and managing invoices
 */

import { db } from '@/lib/db/drizzle';
import { invoices, subscriptions, smsUsage, aiUsage, storageUsage, organizations, users } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { calculateTaxAmount, getTaxRateForUser } from './tax-calculator';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  metadata?: Record<string, any>;
}

export interface InvoiceData {
  organizationId?: string;
  userId?: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate?: Date;
  notes?: string;
}

/**
 * Generate invoice number in format: INV-YYYYMM-XXXX
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}`;
  
  // Get the last invoice with this prefix
  const lastInvoice = await db.query.invoices.findFirst({
    where: (invoice, { like }) => like(invoice.invoiceNumber, `${prefix}%`),
    orderBy: (invoice, { desc }) => [desc(invoice.createdAt)],
  });
  
  let sequence = 1;
  if (lastInvoice?.invoiceNumber) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Calculate subscription cost for the period
 */
async function calculateSubscriptionCost(
  organizationId: string | undefined,
  userId: string | undefined,
  periodStart: Date,
  periodEnd: Date
): Promise<LineItem[]> {
  const lineItems: LineItem[] = [];
  
  const subscription = await db.query.subscriptions.findFirst({
    where: organizationId
      ? eq(subscriptions.organizationId, organizationId)
      : eq(subscriptions.userId, userId!),
  });
  
  if (!subscription) return lineItems;
  
  const pricePerMonth = parseFloat(subscription.pricePerMonth || '0');
  const seats = subscription.seatsUsed || 1;
  const isAnnual = subscription.billingCycle === 'annual';
  
  const description = isAnnual
    ? `${subscription.planName} Plan (Annual) - ${seats} seat(s)`
    : `${subscription.planName} Plan (Monthly) - ${seats} seat(s)`;
  
  lineItems.push({
    description,
    quantity: seats,
    unitPrice: pricePerMonth,
    total: pricePerMonth * seats,
    metadata: {
      planName: subscription.planName,
      billingCycle: subscription.billingCycle,
      seats,
    },
  });
  
  return lineItems;
}

/**
 * Calculate SMS usage cost with tiered pricing
 */
async function calculateSMSCost(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<LineItem[]> {
  const lineItems: LineItem[] = [];
  
  const usage = await db.query.smsUsage.findFirst({
    where: and(
      eq(smsUsage.userId, userId),
      gte(smsUsage.periodStart, periodStart),
      lte(smsUsage.periodEnd, periodEnd)
    ),
  });
  
  if (!usage || !usage.totalMessagesSent) return lineItems;
  
  const messagesSent = usage.totalMessagesSent;
  const cost = parseFloat(usage.totalChargedUsd || '0');
  
  lineItems.push({
    description: `SMS Messages (${messagesSent} messages)`,
    quantity: messagesSent,
    unitPrice: cost / messagesSent,
    total: cost,
    metadata: {
      tier1: Math.min(messagesSent, 1000),
      tier2: Math.min(Math.max(messagesSent - 1000, 0), 9000),
      tier3: Math.max(messagesSent - 10000, 0),
    },
  });
  
  return lineItems;
}

/**
 * Calculate AI usage cost
 */
async function calculateAICost(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<LineItem[]> {
  const lineItems: LineItem[] = [];
  
  const usageRecords = await db.query.aiUsage.findMany({
    where: and(
      eq(aiUsage.userId, userId),
      gte(aiUsage.periodStart, periodStart),
      lte(aiUsage.periodEnd, periodEnd)
    ),
  });
  
  if (!usageRecords.length) return lineItems;
  
  const totalOverage = usageRecords.reduce((sum, record) => sum + (record.overageRequests || 0), 0);
  const totalCost = usageRecords.reduce((sum, record) => sum + parseFloat(record.totalCostUsd || '0'), 0);
  
  if (totalCost > 0) {
    lineItems.push({
      description: `AI Requests Overage (${totalOverage} requests)`,
      quantity: totalOverage,
      unitPrice: 0.001, // $0.001 per request
      total: totalCost,
      metadata: {
        breakdown: usageRecords.map(r => ({
          feature: r.feature,
          requests: r.overageRequests,
          cost: parseFloat(r.totalCostUsd || '0'),
        })),
      },
    });
  }
  
  return lineItems;
}

/**
 * Calculate storage overage cost
 */
async function calculateStorageCost(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<LineItem[]> {
  const lineItems: LineItem[] = [];
  
  const usage = await db.query.storageUsage.findFirst({
    where: and(
      eq(storageUsage.userId, userId),
      gte(storageUsage.periodStart, periodStart),
      lte(storageUsage.periodEnd, periodEnd)
    ),
  });
  
  if (!usage || parseFloat(usage.overageGb || '0') <= 0) return lineItems;
  
  const overageGb = parseFloat(usage.overageGb || '0');
  const cost = parseFloat(usage.overageCostUsd || '0');
  
  lineItems.push({
    description: `Storage Overage (${overageGb.toFixed(2)} GB)`,
    quantity: overageGb,
    unitPrice: 0.10, // $0.10 per GB
    total: cost,
    metadata: {
      totalBytes: usage.totalBytes,
      includedGb: parseFloat(usage.includedGb || '50'),
      overageGb,
    },
  });
  
  return lineItems;
}

/**
 * Generate a complete invoice
 */
export async function generateInvoice(data: InvoiceData) {
  const { organizationId, userId, periodStart, periodEnd, dueDate, notes } = data;
  
  if (!organizationId && !userId) {
    throw new Error('Either organizationId or userId must be provided');
  }
  
  // Collect all line items
  const lineItems: LineItem[] = [];
  
  // 1. Subscription cost
  const subscriptionItems = await calculateSubscriptionCost(organizationId, userId, periodStart, periodEnd);
  lineItems.push(...subscriptionItems);
  
  // 2. Usage costs (for each user in org, or for individual user)
  let userIds: string[] = [];
  
  if (organizationId) {
    // Get all users in organization
    const orgUsers = await db.query.users.findMany({
      where: eq(users.organizationId, organizationId),
    });
    userIds = orgUsers.map(u => u.id);
  } else {
    userIds = [userId!];
  }
  
  // Calculate usage for all users
  for (const uid of userIds) {
    const smsItems = await calculateSMSCost(uid, periodStart, periodEnd);
    const aiItems = await calculateAICost(uid, periodStart, periodEnd);
    const storageItems = await calculateStorageCost(uid, periodStart, periodEnd);
    
    lineItems.push(...smsItems, ...aiItems, ...storageItems);
  }
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate tax based on user location
  let taxAmount = 0;
  let taxRate = 0;
  
  if (data.userId) {
    const taxInfo = await getTaxRateForUser(data.userId);
    taxRate = taxInfo.rate;
    taxAmount = subtotal * taxRate;
  }
  
  const total = subtotal + taxAmount;
  
  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();
  
  // Set due date (default: 30 days from now)
  const invoiceDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  // Create invoice
  const [invoice] = await db.insert(invoices).values({
    organizationId,
    userId,
    invoiceNumber,
    amountUsd: subtotal.toFixed(2),
    taxAmountUsd: taxAmount.toFixed(2),
    totalUsd: total.toFixed(2),
    status: 'draft',
    dueDate: invoiceDueDate,
    periodStart,
    periodEnd,
    lineItems: lineItems as any,
    notes,
  }).returning();
  
  return invoice;
}

/**
 * Mark invoice as sent
 */
export async function sendInvoice(invoiceId: string) {
  await db.update(invoices)
    .set({
      status: 'sent',
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(invoiceId: string, paymentMethod: string, stripePaymentIntentId?: string) {
  await db.update(invoices)
    .set({
      status: 'paid',
      paidAt: new Date(),
      paymentMethod,
      stripePaymentIntentId,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));
}

/**
 * Cancel/void invoice
 */
export async function voidInvoice(invoiceId: string) {
  await db.update(invoices)
    .set({
      status: 'void',
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));
}

/**
 * Get invoice by ID with full details
 */
export async function getInvoiceDetails(invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      organization: true,
      user: true,
    },
  });
  
  return invoice;
}

/**
 * Get all invoices for an organization or user
 */
export async function getInvoices(organizationId?: string, userId?: string, limit = 50) {
  if (!organizationId && !userId) {
    throw new Error('Either organizationId or userId must be provided');
  }
  
  const results = await db.query.invoices.findMany({
    where: organizationId
      ? eq(invoices.organizationId, organizationId)
      : eq(invoices.userId, userId!),
    orderBy: (invoice, { desc }) => [desc(invoice.createdAt)],
    limit,
  });
  
  return results;
}

