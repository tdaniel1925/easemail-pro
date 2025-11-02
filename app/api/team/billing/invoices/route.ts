/**
 * Team Billing API - Invoices
 * GET /api/team/billing/invoices - List all invoices for team
 * POST /api/team/billing/invoices - Generate new invoice
 * GET /api/team/billing/invoices/[id] - Get invoice details
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth/permissions';
import { generateInvoice, getInvoices } from '@/lib/billing/invoice-generator';

export async function GET(request: NextRequest) {
  try {
    const context = await requireOrgAdmin();
    
    if (!context.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const invoices = await getInvoices(context.organizationId, undefined, limit);
    
    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (error: any) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireOrgAdmin();
    
    if (!context.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const { periodStart, periodEnd, dueDate, notes } = body;
    
    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, error: 'periodStart and periodEnd are required' },
        { status: 400 }
      );
    }
    
    const invoice = await generateInvoice({
      organizationId: context.organizationId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    });
    
    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error('Failed to generate invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

