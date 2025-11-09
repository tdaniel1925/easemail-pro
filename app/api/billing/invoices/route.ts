import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, invoices } from '@/lib/db/schema';
import { eq, or, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/invoices
 * Get current user's invoices
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get invoices (either user's individual or org invoices)
    const userInvoices = await db.query.invoices.findMany({
      where: or(
        eq(invoices.userId, user.id),
        dbUser.organizationId ? eq(invoices.organizationId, dbUser.organizationId) : undefined
      ),
      orderBy: [desc(invoices.createdAt)],
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      invoices: userInvoices.map((invoice) => ({
        id: invoice.id,
        stripeInvoiceId: invoice.stripeInvoiceId,
        amount: invoice.amount,
        tax: invoice.tax,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        createdAt: invoice.createdAt,
        paidAt: invoice.paidAt,
        invoiceUrl: invoice.invoiceUrl,
        invoicePdfUrl: invoice.invoicePdfUrl,
      })),
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
