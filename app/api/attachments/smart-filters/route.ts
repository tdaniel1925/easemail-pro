/**
 * Smart Filters API Route
 * GET /api/attachments/smart-filters
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Force dynamic rendering - this route uses cookies
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get counts for each smart filter
    const [
      unpaidInvoicesResult,
      expiringContractsResult,
      largeReceiptsResult,
      recentImagesResult,
      largeFilesResult,
      unprocessedResult,
    ] = await Promise.all([
      // Unpaid invoices
      supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('document_type', 'invoice')
        .contains('extracted_metadata', { isPaid: false }),

      // Expiring contracts (next 90 days)
      supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('document_type', 'contract'),
      // TODO: Add date filter for expiration

      // Large receipts (over $100)
      supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('document_type', 'receipt'),
      // TODO: Add amount filter

      // Recent images (last 30 days)
      supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('file_extension', ['jpg', 'jpeg', 'png', 'gif', 'webp'])
        .gte('email_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Large files (> 10MB)
      supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('file_size_bytes', 10 * 1024 * 1024),

      // Unprocessed
      supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('ai_processed', false),
    ]);

    const filters = [
      {
        id: 'unpaid_invoices',
        label: 'Unpaid Invoices',
        description: 'Invoices marked as unpaid',
        icon: 'CurrencyDollarIcon',
        count: unpaidInvoicesResult.count || 0,
        params: {
          documentTypes: ['invoice'],
          // In a full implementation, you'd filter by isPaid in metadata
        },
      },
      {
        id: 'expiring_contracts',
        label: 'Contracts Expiring Soon',
        description: 'Contracts expiring within 90 days',
        icon: 'DocumentCheckIcon',
        count: expiringContractsResult.count || 0,
        params: {
          documentTypes: ['contract'],
        },
      },
      {
        id: 'large_receipts',
        label: 'Large Receipts',
        description: 'Receipts over $100',
        icon: 'ReceiptPercentIcon',
        count: largeReceiptsResult.count || 0,
        params: {
          documentTypes: ['receipt'],
        },
      },
      {
        id: 'recent_images',
        label: 'Recent Images',
        description: 'Images from last 30 days',
        icon: 'PhotoIcon',
        count: recentImagesResult.count || 0,
        params: {
          fileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      {
        id: 'large_files',
        label: 'Large Files',
        description: 'Files over 10MB',
        icon: 'ArrowDownTrayIcon',
        count: largeFilesResult.count || 0,
        params: {
          minSize: 10 * 1024 * 1024,
        },
      },
      {
        id: 'unprocessed',
        label: 'Unprocessed',
        description: 'Attachments not yet analyzed by AI',
        icon: 'ClockIcon',
        count: unprocessedResult.count || 0,
        params: {
          aiProcessedOnly: false,
        },
      },
    ];

    return NextResponse.json({ filters });
  } catch (error) {
    console.error('Smart filters API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

