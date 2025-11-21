/**
 * Database Email Search API
 * GET /api/search/emails-db
 * Search ALL emails in the local PostgreSQL database (not Nylas API)
 * This allows AI to search through years of emails (5000+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { and, or, like, eq, gte, lte, desc, sql } from 'drizzle-orm';

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
    const accountId = searchParams.get('accountId');
    const query = searchParams.get('query') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const subject = searchParams.get('subject');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const isUnread = searchParams.get('isUnread');
    const isStarred = searchParams.get('isStarred');
    const hasAttachment = searchParams.get('hasAttachment');
    const limit = parseInt(searchParams.get('limit') || '100'); // Default 100, allows up to 1000

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Account ID is required',
      }, { status: 400 });
    }

    console.log(`[DB Email Search] Searching database for account ${accountId}`, {
      query,
      from,
      to,
      subject,
      dateFrom,
      dateTo,
      isUnread,
      isStarred,
      hasAttachment,
      limit,
    });

    // Build WHERE conditions
    const conditions = [
      eq(emails.accountId, accountId),
      eq(emails.isTrashed, false), // Don't search trashed emails
    ];

    // Text search in subject and body
    if (query && query.trim().length > 0) {
      const searchTerm = `%${query.trim()}%`;
      conditions.push(
        or(
          like(emails.subject, searchTerm),
          like(emails.bodyPlain, searchTerm),
          like(emails.snippet, searchTerm)
        )!
      );
    }

    // Filter by sender email
    if (from) {
      conditions.push(like(emails.fromEmail, `%${from}%`));
    }

    // Filter by recipient (check toEmails JSON array)
    if (to) {
      conditions.push(sql`${emails.toEmails}::text LIKE ${`%${to}%`}`);
    }

    // Filter by subject
    if (subject) {
      conditions.push(like(emails.subject, `%${subject}%`));
    }

    // Date range filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      conditions.push(gte(emails.receivedAt, fromDate));
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      conditions.push(lte(emails.receivedAt, toDate));
    }

    // Boolean filters
    if (isUnread === 'true') {
      conditions.push(eq(emails.isRead, false));
    }

    if (isStarred === 'true') {
      conditions.push(eq(emails.isStarred, true));
    }

    if (hasAttachment === 'true') {
      conditions.push(sql`jsonb_array_length(${emails.attachments}) > 0`);
    }

    // Execute database query
    const results = await db.query.emails.findMany({
      where: and(...conditions),
      orderBy: desc(emails.receivedAt),
      limit: Math.min(limit, 1000), // Cap at 1000 for performance
    });

    console.log(`[DB Email Search] Found ${results.length} emails in database`);

    // Format results to match the expected email format
    const formattedEmails = results.map((email: any) => ({
      id: email.id,
      thread_id: email.threadId,
      subject: email.subject || '(No Subject)',
      from: [{ email: email.fromEmail, name: email.fromName }],
      to: email.toEmails || [],
      cc: email.ccEmails || [],
      date: Math.floor(email.receivedAt.getTime() / 1000), // Convert to Unix timestamp
      snippet: email.snippet || '',
      unread: !email.isRead,
      starred: email.isStarred,
      hasAttachments: (email.attachments?.length || 0) > 0,
      folders: email.folderIds || [],
      labels: email.labels || [],
      body_preview: email.snippet,
    }));

    const took_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      emails: formattedEmails,
      total: formattedEmails.length,
      source: 'database', // Indicate this came from database, not Nylas API
      took_ms,
    });
  } catch (error: any) {
    console.error('❌ Database email search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Database email search failed',
        details: error.message,
        took_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
