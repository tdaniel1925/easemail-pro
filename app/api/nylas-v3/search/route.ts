/**
 * Nylas v3 Email Search API
 * GET /api/nylas-v3/search
 * Search emails using Nylas API (not database)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { fetchMessages } from '@/lib/nylas-v3/messages';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId'); // This is Nylas Grant ID
    const query = searchParams.get('query') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const subject = searchParams.get('subject');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const unread = searchParams.get('unread');
    const starred = searchParams.get('starred');
    const has_attachment = searchParams.get('has_attachment');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Account ID is required',
      }, { status: 400 });
    }

    console.log(`[Nylas Search] Searching Nylas API for account ${accountId}`, {
      query,
      from,
      to,
      subject,
      dateFrom,
      dateTo,
      unread,
      starred,
      has_attachment,
      limit,
    });

    // Verify account exists and user owns it
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found',
      }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access to account',
      }, { status: 403 });
    }

    // Fetch messages from Nylas API
    // Note: Nylas API doesn't support complex search queries, so we fetch a large batch
    // and filter client-side. For production, you may want to implement server-side indexing.
    const fetchLimit = Math.min(limit * 3, 1000); // Fetch more than needed for filtering
    const result = await fetchMessages({
      grantId: accountId,
      limit: fetchLimit,
      unread: unread === 'true' ? true : unread === 'false' ? false : undefined,
    });

    let messages = result.messages;

    // Client-side filtering
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      messages = messages.filter((msg: any) => {
        const subject = (msg.subject || '').toLowerCase();
        const snippet = (msg.snippet || '').toLowerCase();
        const body = (msg.body || '').toLowerCase();
        return subject.includes(searchTerm) || snippet.includes(searchTerm) || body.includes(searchTerm);
      });
    }

    if (from) {
      const fromTerm = from.toLowerCase();
      messages = messages.filter((msg: any) => {
        const senderEmail = (msg.from?.[0]?.email || '').toLowerCase();
        const senderName = (msg.from?.[0]?.name || '').toLowerCase();
        return senderEmail.includes(fromTerm) || senderName.includes(fromTerm);
      });
    }

    if (to) {
      const toTerm = to.toLowerCase();
      messages = messages.filter((msg: any) => {
        return msg.to?.some((recipient: any) => {
          const email = (recipient.email || '').toLowerCase();
          const name = (recipient.name || '').toLowerCase();
          return email.includes(toTerm) || name.includes(toTerm);
        });
      });
    }

    if (subject) {
      const subjectTerm = subject.toLowerCase();
      messages = messages.filter((msg: any) => {
        return (msg.subject || '').toLowerCase().includes(subjectTerm);
      });
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime() / 1000;
      messages = messages.filter((msg: any) => msg.date >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo).getTime() / 1000;
      messages = messages.filter((msg: any) => msg.date <= toDate);
    }

    if (starred === 'true') {
      messages = messages.filter((msg: any) => msg.starred === true);
    }

    if (has_attachment === 'true') {
      messages = messages.filter((msg: any) => (msg.attachments?.length || 0) > 0);
    }

    // Limit results
    messages = messages.slice(0, limit);

    console.log(`[Nylas Search] Found ${messages.length} messages from Nylas API`);

    // Log sample results for debugging
    if (from && messages.length > 0) {
      console.log(`[Nylas Search] First 3 results:`, messages.slice(0, 3).map((msg: any) => ({
        subject: msg.subject,
        from: msg.from?.[0],
        date: msg.date,
      })));
    }

    const took_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      messages,
      total: messages.length,
      source: 'nylas-api',
      took_ms,
    });
  } catch (error: any) {
    console.error('❌ Nylas search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Nylas search failed',
        details: error.message,
        took_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
