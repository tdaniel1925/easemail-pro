/**
 * Invoice Detail API
 * GET /api/team/billing/invoices/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth/permissions';
import { getInvoiceDetails, sendInvoice, markInvoicePaid, voidInvoice } from '@/lib/billing/invoice-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireOrgAdmin();
    const invoiceId = params.id;
    
    const invoice = await getInvoiceDetails(invoiceId);
    
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Verify access
    if (invoice.organizationId !== context.organizationId && !context.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error('Failed to fetch invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireOrgAdmin();
    const invoiceId = params.id;
    const body = await request.json();
    const { action, paymentMethod, stripePaymentIntentId } = body;
    
    // Verify invoice belongs to this org
    const invoice = await getInvoiceDetails(invoiceId);
    if (!invoice || (invoice.organizationId !== context.organizationId && !context.isPlatformAdmin)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Handle different actions
    switch (action) {
      case 'send':
        await sendInvoice(invoiceId);
        break;
      case 'mark_paid':
        if (!paymentMethod) {
          return NextResponse.json(
            { success: false, error: 'paymentMethod is required' },
            { status: 400 }
          );
        }
        await markInvoicePaid(invoiceId, paymentMethod, stripePaymentIntentId);
        break;
      case 'void':
        await voidInvoice(invoiceId);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    const updatedInvoice = await getInvoiceDetails(invoiceId);
    
    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

