/**
 * Monthly Invoice Service
 * 
 * Generates and processes monthly invoices automatically
 * Includes subscription charges (with pro-rating) and usage costs
 */

import { db } from '@/lib/db';
import { invoices, costEntries, subscriptions, organizations, users } from '@/lib/db/schema';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { 
  getUnbilledSubscriptionPeriods, 
  markSubscriptionPeriodsBilled,
  formatProRatedDescription 
} from './prorating-service';
import { getBillingPeriodForDate, getLastMonthPeriod } from '@/lib/usage/enhanced-cost-tracker';
import { createRevenueScheduleForInvoice } from '@/lib/accounting/revenue-recognition';
import { sendEmail } from '@/lib/email/send';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'subscription' | 'usage';
  metadata?: Record<string, any>;
}

export interface GeneratedInvoice {
  id: string;
  invoiceNumber: string;
  userId?: string;
  organizationId?: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
}

/**
 * Generate monthly invoices for all users and organizations
 */
export async function generateMonthlyInvoices(): Promise<{
  invoiceCount: number;
  totalAmount: number;
  failures: Array<{ entityId: string; error: string }>;
}> {
  const lastMonth = getLastMonthPeriod();
  
  let invoiceCount = 0;
  let totalAmount = 0;
  const failures: Array<{ entityId: string; error: string }> = [];
  
  console.log(`[MonthlyInvoice] Starting monthly invoice generation for period ${lastMonth.start.toISOString()} to ${lastMonth.end.toISOString()}`);
  
  // 1. Process organizations
  const orgsWithCosts = await getOrganizationsWithCosts(lastMonth);
  
  for (const org of orgsWithCosts) {
    try {
      const invoice = await generateAndChargeOrgInvoice(org, lastMonth);
      if (invoice) {
        invoiceCount++;
        totalAmount += parseFloat(invoice.total);
      }
    } catch (error: any) {
      console.error(`[MonthlyInvoice] Failed to bill org ${org.id}:`, error);
      failures.push({ entityId: org.id, error: error.message });
    }
  }
  
  // 2. Process individual users (not in orgs)
  const usersWithCosts = await getIndividualUsersWithCosts(lastMonth);
  
  for (const user of usersWithCosts) {
    try {
      const invoice = await generateAndChargeUserInvoice(user, lastMonth);
      if (invoice) {
        invoiceCount++;
        totalAmount += parseFloat(invoice.total);
      }
    } catch (error: any) {
      console.error(`[MonthlyInvoice] Failed to bill user ${user.id}:`, error);
      failures.push({ entityId: user.id, error: error.message });
    }
  }
  
  console.log(`[MonthlyInvoice] Completed: ${invoiceCount} invoices, $${totalAmount.toFixed(2)} total, ${failures.length} failures`);
  
  return {
    invoiceCount,
    totalAmount,
    failures,
  };
}

/**
 * Generate and charge invoice for an organization
 */
async function generateAndChargeOrgInvoice(
  org: any,
  period: { start: Date; end: Date }
): Promise<any> {
  const lineItems: InvoiceLineItem[] = [];
  
  // 1. Get subscription charges (with pro-rating)
  const subPeriods = await getUnbilledSubscriptionPeriods({
    organizationId: org.id,
    periodStart: period.start,
    periodEnd: period.end,
  });
  
  for (const sp of subPeriods) {
    lineItems.push({
      description: sp.isProRated 
        ? `${org.planType || 'Team'} Plan (Pro-rated: ${sp.daysInPeriod}/${sp.daysInFullMonth} days)`
        : `${org.planType || 'Team'} Plan`,
      quantity: 1,
      unitPrice: parseFloat(sp.proRatedPrice || '0'),
      total: parseFloat(sp.proRatedPrice || '0'),
      type: 'subscription',
      metadata: {
        subscriptionPeriodId: sp.id,
        isProRated: sp.isProRated,
      },
    });
  }
  
  // 2. Get usage charges (AI, SMS, Storage, etc.)
  const costEntries = await getUnbilledCosts({
    organizationId: org.id,
    periodStart: period.start,
    periodEnd: period.end,
  });
  
  const usageByService = aggregateCostsByService(costEntries);
  
  for (const [service, data] of Object.entries(usageByService)) {
    lineItems.push({
      description: `${formatServiceName(service)} Usage`,
      quantity: data.count,
      unitPrice: data.totalCost / data.count,
      total: data.totalCost,
      type: 'usage',
      metadata: {
        service,
        details: data.breakdown,
      },
    });
  }
  
  // Skip if no charges
  if (lineItems.length === 0) {
    console.log(`[MonthlyInvoice] No charges for org ${org.id}, skipping`);
    return null;
  }
  
  // 3. Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = 0; // TODO: Implement tax calculation
  const total = subtotal + taxAmount;
  
  // 4. Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();
  
  // 5. Create invoice
  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    organizationId: org.id,
    userId: null,
    periodStart: period.start,
    periodEnd: period.end,
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: total.toFixed(2),
    status: 'pending',
    dueDate: new Date(), // Immediate payment
  }).returning();
  
  // 6. Link costs to invoice
  await linkCostsToInvoice(costEntries.map(c => c.id), invoice.id);
  
  // 7. Mark subscription periods as billed
  if (subPeriods.length > 0) {
    await markSubscriptionPeriodsBilled(
      subPeriods.map(sp => sp.id),
      invoice.id
    );
  }
  
  // 8. Create revenue schedule
  // await createRevenueScheduleForInvoice(invoice, lineItems);
  
  // 9. Attempt to charge
  try {
    await chargeInvoice(invoice);
  } catch (error) {
    console.error(`[MonthlyInvoice] Failed to charge invoice ${invoice.id}:`, error);
    // Invoice created but payment failed - will be handled by dunning
  }
  
  // 10. Send invoice email
  await sendInvoiceEmail(invoice, org, lineItems);
  
  console.log(`[MonthlyInvoice] Generated invoice ${invoiceNumber} for org ${org.id}: $${total.toFixed(2)}`);
  
  return invoice;
}

/**
 * Generate and charge invoice for an individual user
 */
async function generateAndChargeUserInvoice(
  user: any,
  period: { start: Date; end: Date }
): Promise<any> {
  const lineItems: InvoiceLineItem[] = [];
  
  // 1. Get subscription charges
  const subPeriods = await getUnbilledSubscriptionPeriods({
    userId: user.id,
    periodStart: period.start,
    periodEnd: period.end,
  });
  
  for (const sp of subPeriods) {
    lineItems.push({
      description: sp.isProRated 
        ? `Individual Plan (Pro-rated: ${sp.daysInPeriod}/${sp.daysInFullMonth} days)`
        : 'Individual Plan',
      quantity: 1,
      unitPrice: parseFloat(sp.proRatedPrice || '0'),
      total: parseFloat(sp.proRatedPrice || '0'),
      type: 'subscription',
      metadata: {
        subscriptionPeriodId: sp.id,
        isProRated: sp.isProRated,
      },
    });
  }
  
  // 2. Get usage charges
  const costEntries = await getUnbilledCosts({
    userId: user.id,
    periodStart: period.start,
    periodEnd: period.end,
  });
  
  const usageByService = aggregateCostsByService(costEntries);
  
  for (const [service, data] of Object.entries(usageByService)) {
    lineItems.push({
      description: `${formatServiceName(service)} Usage`,
      quantity: data.count,
      unitPrice: data.totalCost / data.count,
      total: data.totalCost,
      type: 'usage',
      metadata: {
        service,
        details: data.breakdown,
      },
    });
  }
  
  // Skip if no charges
  if (lineItems.length === 0) {
    console.log(`[MonthlyInvoice] No charges for user ${user.id}, skipping`);
    return null;
  }
  
  // 3. Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = 0;
  const total = subtotal + taxAmount;
  
  // 4. Generate invoice
  const invoiceNumber = await generateInvoiceNumber();
  
  const [invoice] = await db.insert(invoices).values({
    invoiceNumber,
    userId: user.id,
    organizationId: null,
    periodStart: period.start,
    periodEnd: period.end,
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: total.toFixed(2),
    status: 'pending',
    dueDate: new Date(),
  }).returning();
  
  // 5. Link costs and mark periods as billed
  await linkCostsToInvoice(costEntries.map(c => c.id), invoice.id);
  
  if (subPeriods.length > 0) {
    await markSubscriptionPeriodsBilled(
      subPeriods.map(sp => sp.id),
      invoice.id
    );
  }
  
  // 6. Attempt to charge
  try {
    await chargeInvoice(invoice);
  } catch (error) {
    console.error(`[MonthlyInvoice] Failed to charge invoice ${invoice.id}:`, error);
  }
  
  // 7. Send invoice email
  await sendInvoiceEmail(invoice, user, lineItems);
  
  console.log(`[MonthlyInvoice] Generated invoice ${invoiceNumber} for user ${user.id}: $${total.toFixed(2)}`);
  
  return invoice;
}

/**
 * Get organizations with unbilled costs
 */
async function getOrganizationsWithCosts(period: { start: Date; end: Date }) {
  // Get all active organizations
  const orgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.isActive, true));
  
  return orgs;
}

/**
 * Get individual users with unbilled costs (not in organizations)
 */
async function getIndividualUsersWithCosts(period: { start: Date; end: Date }) {
  const allUsers = await db
    .select()
    .from(users)
    .where(isNull(users.organizationId));
  
  return allUsers;
}

/**
 * Get unbilled cost entries
 */
async function getUnbilledCosts(params: {
  userId?: string;
  organizationId?: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const { userId, organizationId, periodStart, periodEnd } = params;
  
  const conditions = [
    isNull(costEntries.invoiceId),
    gte(costEntries.periodStart, periodStart),
    lte(costEntries.periodEnd, periodEnd),
  ];
  
  if (userId) {
    conditions.push(eq(costEntries.userId, userId));
  }
  
  if (organizationId) {
    conditions.push(eq(costEntries.organizationId, organizationId));
  }
  
  return await db
    .select()
    .from(costEntries)
    .where(and(...conditions));
}

/**
 * Aggregate costs by service
 */
function aggregateCostsByService(costs: any[]): Record<string, { totalCost: number; count: number; breakdown: any[] }> {
  return costs.reduce((acc, cost) => {
    const service = cost.service;
    if (!acc[service]) {
      acc[service] = {
        totalCost: 0,
        count: 0,
        breakdown: [],
      };
    }
    
    acc[service].totalCost += parseFloat(cost.costUsd || '0');
    acc[service].count += 1;
    acc[service].breakdown.push({
      feature: cost.feature,
      cost: parseFloat(cost.costUsd || '0'),
      quantity: cost.quantity,
      unit: cost.unit,
    });
    
    return acc;
  }, {} as Record<string, { totalCost: number; count: number; breakdown: any[] }>);
}

/**
 * Format service name for display
 */
function formatServiceName(service: string): string {
  const names: Record<string, string> = {
    openai: 'AI Services',
    sms: 'SMS',
    storage: 'Storage',
    whisper: 'Voice Transcription',
    stripe_fee: 'Payment Processing',
  };
  
  return names[service] || service;
}

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(): Promise<string> {
  const [latest] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .orderBy(invoices.createdAt)
    .limit(1);
  
  let nextNumber = 1;
  
  if (latest?.invoiceNumber) {
    const match = latest.invoiceNumber.match(/INV-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  return `INV-${year}${month}-${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Link cost entries to invoice
 */
async function linkCostsToInvoice(costIds: string[], invoiceId: string): Promise<void> {
  if (costIds.length === 0) return;
  
  for (const costId of costIds) {
    await db
      .update(costEntries)
      .set({ invoiceId })
      .where(eq(costEntries.id, costId));
  }
  
  console.log(`[MonthlyInvoice] Linked ${costIds.length} cost entries to invoice ${invoiceId}`);
}

/**
 * Charge an invoice
 */
async function chargeInvoice(invoice: any): Promise<void> {
  // TODO: Implement Stripe payment processing
  // This will be integrated with the existing Stripe setup
  
  console.log(`[MonthlyInvoice] TODO: Charge invoice ${invoice.id} for $${invoice.total}`);
  
  // For now, mark as paid
  await db
    .update(invoices)
    .set({
      status: 'paid',
      paidAt: new Date(),
    })
    .where(eq(invoices.id, invoice.id));
}

/**
 * Send invoice email
 */
async function sendInvoiceEmail(
  invoice: any,
  entity: any,
  lineItems: InvoiceLineItem[]
): Promise<void> {
  const email = entity.billingEmail || entity.email;
  if (!email) return;
  
  const lineItemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');
  
  await sendEmail({
    to: email,
    subject: `Invoice ${invoice.invoiceNumber} - $${invoice.total}`,
    html: `
      <h2>Invoice ${invoice.invoiceNumber}</h2>
      <p><strong>Period:</strong> ${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${invoice.status}</p>
      <br/>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">Description</th>
            <th style="padding: 8px; text-align: right;">Quantity</th>
            <th style="padding: 8px; text-align: right;">Unit Price</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="padding: 8px; text-align: right;"><strong>$${invoice.subtotal}</strong></td>
          </tr>
          ${parseFloat(invoice.taxAmount) > 0 ? `
          <tr>
            <td colspan="3" style="padding: 8px; text-align: right;"><strong>Tax:</strong></td>
            <td style="padding: 8px; text-align: right;"><strong>$${invoice.taxAmount}</strong></td>
          </tr>
          ` : ''}
          <tr style="font-size: 1.2em;">
            <td colspan="3" style="padding: 8px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 8px; text-align: right;"><strong>$${invoice.total}</strong></td>
          </tr>
        </tfoot>
      </table>
      <br/>
      <p>Thank you for your business!</p>
    `,
  });
}

