/**
 * Credit Note Service
 * 
 * Handles credit notes, refunds, and billing adjustments
 */

import { db } from '@/lib/db';
import { creditNotes, invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

export type CreditNoteType = 'refund' | 'adjustment' | 'goodwill' | 'dispute';

export interface CreditNoteParams {
  invoiceId: string;
  amount: number;
  reason: string;
  type: CreditNoteType;
  adminId: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId: string | null;
  userId: string | null;
  organizationId: string | null;
  amountUsd: string;
  reason: string | null;
  type: string | null;
  status: string;
  issuedAt: Date | null;
  appliedAt: Date | null;
  stripeCreditNoteId: string | null;
  createdAt: Date;
  createdBy: string | null;
}

/**
 * Issue a credit note
 */
export async function issueCreditNote(params: CreditNoteParams): Promise<CreditNote> {
  const { invoiceId, amount, reason, type, adminId } = params;
  
  // Get invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }
  
  // Generate credit note number
  const creditNoteNumber = await generateCreditNoteNumber();
  
  // Create credit note
  const [creditNote] = await db
    .insert(creditNotes)
    .values({
      creditNoteNumber,
      invoiceId,
      userId: invoice.userId || null,
      organizationId: invoice.organizationId || null,
      amountUsd: amount.toFixed(2),
      reason,
      type,
      status: 'issued',
      issuedAt: new Date(),
      createdBy: adminId,
    })
    .returning();
  
  console.log(
    `[CreditNote] Issued ${type} credit note ${creditNoteNumber} for $${amount}`
  );
  
  // Process refund if applicable and Stripe payment exists
  if (type === 'refund' && invoice.stripePaymentIntentId && stripe) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: invoice.stripePaymentIntentId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          credit_note_id: creditNote.id,
          credit_note_number: creditNoteNumber,
          invoice_id: invoiceId,
        },
      });
      
      // Update credit note with Stripe refund ID
      await db
        .update(creditNotes)
        .set({
          stripeCreditNoteId: refund.id,
          status: 'applied',
          appliedAt: new Date(),
        })
        .where(eq(creditNotes.id, creditNote.id));
      
      console.log(`[CreditNote] Processed Stripe refund: ${refund.id}`);
    } catch (error: any) {
      console.error('[CreditNote] Error processing Stripe refund:', error);
      // Don't fail the credit note creation, just log the error
    }
  } else if (type !== 'refund') {
    // For non-refund types, mark as applied immediately
    await db
      .update(creditNotes)
      .set({
        status: 'applied',
        appliedAt: new Date(),
      })
      .where(eq(creditNotes.id, creditNote.id));
  }
  
  // Send credit note email
  await sendCreditNoteEmail(creditNote, invoice);
  
  return creditNote as CreditNote;
}

/**
 * Generate a unique credit note number
 */
async function generateCreditNoteNumber(): Promise<string> {
  // Get the latest credit note number
  const [latest] = await db
    .select({ creditNoteNumber: creditNotes.creditNoteNumber })
    .from(creditNotes)
    .orderBy(creditNotes.createdAt)
    .limit(1);
  
  let nextNumber = 1;
  
  if (latest?.creditNoteNumber) {
    // Extract number from format CN000001
    const match = latest.creditNoteNumber.match(/CN(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Format as CN000001, CN000002, etc.
  return `CN${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Send credit note email to customer
 */
async function sendCreditNoteEmail(creditNote: any, invoice: any): Promise<void> {
  const recipient = creditNote.userId || creditNote.organizationId;
  if (!recipient) return;
  
  const email = await getEntityEmail(recipient);
  if (!email) return;
  
  const typeLabels: Record<CreditNoteType, string> = {
    refund: 'Refund',
    adjustment: 'Billing Adjustment',
    goodwill: 'Goodwill Credit',
    dispute: 'Dispute Resolution',
  };
  
  const typeLabel = typeLabels[creditNote.type as CreditNoteType] || 'Credit';
  
  await sendEmail({
    to: email,
    subject: `Credit Note ${creditNote.creditNoteNumber} - $${creditNote.amountUsd}`,
    html: `
      <h2>Credit Note Issued</h2>
      <p><strong>Credit Note Number:</strong> ${creditNote.creditNoteNumber}</p>
      <p><strong>Type:</strong> ${typeLabel}</p>
      <p><strong>Amount:</strong> $${creditNote.amountUsd}</p>
      <p><strong>Related Invoice:</strong> ${invoice.invoiceNumber || invoice.id}</p>
      ${creditNote.reason ? `<p><strong>Reason:</strong> ${creditNote.reason}</p>` : ''}
      <br/>
      <p>This credit ${creditNote.type === 'refund' ? 'has been refunded to your payment method' : 'will be applied to your account'}.</p>
      <p>If you have any questions, please contact our support team.</p>
    `,
  });
}

/**
 * Get email for user or organization
 */
async function getEntityEmail(entityId: string): Promise<string | null> {
  const { users, organizations } = await import('@/lib/db/schema');
  
  // Try user first
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, entityId))
    .limit(1);
  
  if (user) return user.email;
  
  // Try organization
  const [org] = await db
    .select({ email: organizations.billingEmail })
    .from(organizations)
    .where(eq(organizations.id, entityId))
    .limit(1);
  
  return org?.email || null;
}

/**
 * Void a credit note
 */
export async function voidCreditNote(
  creditNoteId: string,
  adminId: string,
  reason?: string
): Promise<void> {
  await db
    .update(creditNotes)
    .set({
      status: 'void',
    })
    .where(eq(creditNotes.id, creditNoteId));
  
  console.log(`[CreditNote] Voided credit note ${creditNoteId} by admin ${adminId}`);
}

/**
 * Get credit notes for an invoice
 */
export async function getCreditNotesForInvoice(invoiceId: string): Promise<CreditNote[]> {
  return await db
    .select()
    .from(creditNotes)
    .where(eq(creditNotes.invoiceId, invoiceId));
}

/**
 * Get credit notes for a user/organization
 */
export async function getCreditNotes(params: {
  userId?: string;
  organizationId?: string;
  limit?: number;
}): Promise<CreditNote[]> {
  const { userId, organizationId, limit = 50 } = params;
  
  let query = db.select().from(creditNotes);
  
  if (userId) {
    query = query.where(eq(creditNotes.userId, userId));
  } else if (organizationId) {
    query = query.where(eq(creditNotes.organizationId, organizationId));
  }
  
  return await query.limit(limit);
}

/**
 * Calculate total credits for an entity
 */
export async function getTotalCredits(params: {
  userId?: string;
  organizationId?: string;
}): Promise<number> {
  const { userId, organizationId } = params;
  
  let query = db.select().from(creditNotes);
  
  if (userId) {
    query = query.where(eq(creditNotes.userId, userId));
  } else if (organizationId) {
    query = query.where(eq(creditNotes.organizationId, organizationId));
  }
  
  const notes = await query;
  
  return notes
    .filter(n => n.status === 'applied' || n.status === 'issued')
    .reduce((sum, n) => sum + parseFloat(n.amountUsd || '0'), 0);
}

/**
 * Apply credit to an invoice
 */
export async function applyCreditToInvoice(
  creditNoteId: string,
  invoiceId: string
): Promise<void> {
  const [creditNote] = await db
    .select()
    .from(creditNotes)
    .where(eq(creditNotes.id, creditNoteId))
    .limit(1);
  
  if (!creditNote) {
    throw new Error(`Credit note not found: ${creditNoteId}`);
  }
  
  if (creditNote.status !== 'issued') {
    throw new Error(`Credit note ${creditNoteId} cannot be applied (status: ${creditNote.status})`);
  }
  
  // Update invoice with credit
  const creditAmount = parseFloat(creditNote.amountUsd || '0');
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }
  
  const newTotal = parseFloat(invoice.total || '0') - creditAmount;
  
  await db
    .update(invoices)
    .set({
      total: newTotal.toFixed(2),
    })
    .where(eq(invoices.id, invoiceId));
  
  // Mark credit note as applied
  await db
    .update(creditNotes)
    .set({
      status: 'applied',
      appliedAt: new Date(),
      invoiceId,
    })
    .where(eq(creditNotes.id, creditNoteId));
  
  console.log(
    `[CreditNote] Applied credit note ${creditNote.creditNoteNumber} ` +
    `($${creditAmount}) to invoice ${invoiceId}`
  );
}

