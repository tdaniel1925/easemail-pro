/**
 * Revenue Recognition Service
 * 
 * Handles revenue recognition for annual subscriptions and deferred revenue
 * Complies with GAAP/IFRS accounting standards
 */

import { db } from '@/lib/db';
import { revenueSchedule, invoices } from '@/lib/db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';

export interface Invoice {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  total: number;
}

export interface InvoiceLineItem {
  id: string;
  type: 'subscription' | 'usage';
  billingCycle?: 'monthly' | 'annual';
  total: number;
  description?: string;
}

/**
 * Create revenue schedule for an invoice line item
 */
export async function createRevenueSchedule(
  invoice: Invoice,
  lineItem: InvoiceLineItem
): Promise<void> {
  // Annual subscription - recognize monthly over 12 months
  if (lineItem.type === 'subscription' && lineItem.billingCycle === 'annual') {
    const monthlyAmount = lineItem.total / 12;
    
    await db.insert(revenueSchedule).values({
      invoiceId: invoice.id,
      invoiceLineItemId: lineItem.id,
      totalAmount: lineItem.total.toFixed(2),
      recognizedAmount: '0.00',
      unrecognizedAmount: lineItem.total.toFixed(2),
      recognitionStart: invoice.periodStart,
      recognitionEnd: invoice.periodEnd,
      recognitionMethod: 'monthly',
      status: 'pending',
    });
    
    console.log(
      `[Revenue] Created monthly recognition schedule for annual subscription: ` +
      `$${lineItem.total} over 12 months ($${monthlyAmount.toFixed(2)}/month)`
    );
    return;
  }
  
  // Usage-based charges - recognize immediately
  if (lineItem.type === 'usage') {
    await db.insert(revenueSchedule).values({
      invoiceId: invoice.id,
      invoiceLineItemId: lineItem.id,
      totalAmount: lineItem.total.toFixed(2),
      recognizedAmount: lineItem.total.toFixed(2),
      unrecognizedAmount: '0.00',
      recognitionStart: invoice.periodStart,
      recognitionEnd: invoice.periodEnd,
      recognitionMethod: 'immediate',
      status: 'complete',
    });
    
    console.log(`[Revenue] Recognized usage revenue immediately: $${lineItem.total}`);
    return;
  }
  
  // Monthly subscription - recognize immediately
  if (lineItem.type === 'subscription' && lineItem.billingCycle === 'monthly') {
    await db.insert(revenueSchedule).values({
      invoiceId: invoice.id,
      invoiceLineItemId: lineItem.id,
      totalAmount: lineItem.total.toFixed(2),
      recognizedAmount: lineItem.total.toFixed(2),
      unrecognizedAmount: '0.00',
      recognitionStart: invoice.periodStart,
      recognitionEnd: invoice.periodEnd,
      recognitionMethod: 'immediate',
      status: 'complete',
    });
    
    console.log(`[Revenue] Recognized monthly subscription revenue immediately: $${lineItem.total}`);
  }
}

/**
 * Recognize scheduled revenue (run monthly via cron)
 */
export async function recognizeScheduledRevenue(): Promise<{
  recognized: number;
  schedules: number;
}> {
  const now = new Date();
  
  // Get all pending or in-progress revenue schedules
  const schedules = await getPendingRevenueSchedules(now);
  
  let totalRecognized = 0;
  let schedulesProcessed = 0;
  
  for (const schedule of schedules) {
    try {
      const recognized = await recognizeRevenueForSchedule(schedule, now);
      totalRecognized += recognized;
      schedulesProcessed++;
    } catch (error) {
      console.error(`[Revenue] Error recognizing revenue for schedule ${schedule.id}:`, error);
    }
  }
  
  console.log(
    `[Revenue] Recognized $${totalRecognized.toFixed(2)} ` +
    `across ${schedulesProcessed} schedules`
  );
  
  return {
    recognized: totalRecognized,
    schedules: schedulesProcessed,
  };
}

/**
 * Get pending revenue schedules
 */
async function getPendingRevenueSchedules(currentDate: Date) {
  return await db
    .select()
    .from(revenueSchedule)
    .where(
      and(
        lte(revenueSchedule.recognitionStart, currentDate),
        gte(revenueSchedule.recognitionEnd, currentDate),
        eq(revenueSchedule.status, 'pending')
      )
    );
}

/**
 * Recognize revenue for a specific schedule
 */
async function recognizeRevenueForSchedule(
  schedule: any,
  currentDate: Date
): Promise<number> {
  const totalAmount = parseFloat(schedule.totalAmount);
  const recognizedAmount = parseFloat(schedule.recognizedAmount || '0');
  const unrecognizedAmount = parseFloat(schedule.unrecognizedAmount || totalAmount);
  
  if (schedule.recognitionMethod === 'monthly') {
    // Calculate months elapsed since recognition start
    const monthsElapsed = getMonthsBetween(schedule.recognitionStart, currentDate);
    const totalMonths = 12; // Annual subscription
    const monthlyAmount = totalAmount / totalMonths;
    
    // Calculate amount to recognize up to current month
    const shouldRecognize = Math.min(
      monthlyAmount * Math.min(monthsElapsed, totalMonths),
      totalAmount
    );
    
    // Calculate new amount to add
    const toRecognize = Math.max(0, shouldRecognize - recognizedAmount);
    
    if (toRecognize > 0) {
      const newRecognized = recognizedAmount + toRecognize;
      const newUnrecognized = totalAmount - newRecognized;
      const isComplete = newUnrecognized <= 0.01; // Account for floating point precision
      
      await db
        .update(revenueSchedule)
        .set({
          recognizedAmount: newRecognized.toFixed(2),
          unrecognizedAmount: newUnrecognized.toFixed(2),
          status: isComplete ? 'complete' : 'recognizing',
          updatedAt: currentDate,
        })
        .where(eq(revenueSchedule.id, schedule.id));
      
      console.log(
        `[Revenue] Schedule ${schedule.id}: Recognized $${toRecognize.toFixed(2)} ` +
        `(${monthsElapsed}/${totalMonths} months elapsed)`
      );
      
      return toRecognize;
    }
  }
  
  return 0;
}

/**
 * Get months between two dates
 */
function getMonthsBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthsDiff = endDate.getMonth() - startDate.getMonth();
  const daysDiff = endDate.getDate() - startDate.getDate();
  
  let totalMonths = yearsDiff * 12 + monthsDiff;
  
  // Add partial month if day has passed
  if (daysDiff >= 0) {
    totalMonths += 1;
  }
  
  return Math.max(0, totalMonths);
}

/**
 * Get revenue recognition summary for reporting
 */
export async function getRevenueRecognitionSummary(params?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalRevenue: number;
  recognizedRevenue: number;
  deferredRevenue: number;
  byStatus: Record<string, number>;
}> {
  const conditions = [];
  
  if (params?.startDate && params?.endDate) {
    conditions.push(
      and(
        gte(revenueSchedule.recognitionStart, params.startDate),
        lte(revenueSchedule.recognitionEnd, params.endDate)
      )
    );
  }
  
  const schedules = conditions.length > 0
    ? await db.select().from(revenueSchedule).where(and(...conditions))
    : await db.select().from(revenueSchedule);
  
  const totalRevenue = schedules.reduce(
    (sum, s) => sum + parseFloat(s.totalAmount || '0'),
    0
  );
  
  const recognizedRevenue = schedules.reduce(
    (sum, s) => sum + parseFloat(s.recognizedAmount || '0'),
    0
  );
  
  const deferredRevenue = schedules.reduce(
    (sum, s) => sum + parseFloat(s.unrecognizedAmount || '0'),
    0
  );
  
  const byStatus = schedules.reduce((acc, s) => {
    const status = s.status || 'unknown';
    acc[status] = (acc[status] || 0) + parseFloat(s.totalAmount || '0');
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalRevenue,
    recognizedRevenue,
    deferredRevenue,
    byStatus,
  };
}

/**
 * Get deferred revenue balance (for balance sheet)
 */
export async function getDeferredRevenueBalance(): Promise<number> {
  const schedules = await db
    .select()
    .from(revenueSchedule)
    .where(eq(revenueSchedule.status, 'recognizing'));
  
  const deferredRevenue = schedules.reduce(
    (sum, s) => sum + parseFloat(s.unrecognizedAmount || '0'),
    0
  );
  
  return deferredRevenue;
}

/**
 * Get recognized revenue for a period (for P&L)
 */
export async function getRecognizedRevenueForPeriod(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const schedules = await db
    .select()
    .from(revenueSchedule)
    .where(
      and(
        gte(revenueSchedule.recognitionStart, startDate),
        lte(revenueSchedule.recognitionEnd, endDate)
      )
    );
  
  const recognized = schedules.reduce(
    (sum, s) => sum + parseFloat(s.recognizedAmount || '0'),
    0
  );
  
  return recognized;
}

/**
 * Create revenue schedule for entire invoice
 */
export async function createRevenueScheduleForInvoice(
  invoice: Invoice,
  lineItems: InvoiceLineItem[]
): Promise<void> {
  for (const lineItem of lineItems) {
    await createRevenueSchedule(invoice, lineItem);
  }
}

