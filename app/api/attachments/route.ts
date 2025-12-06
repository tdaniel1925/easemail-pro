/**
 * Attachments API Route - List & Search
 * GET /api/attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments, emails } from '@/lib/db/schema';
import { eq, and, desc, asc, gte, lte, inArray, sql, or, like, notInArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

// Excluded file extensions (should match attachment-filter.ts)
const EXCLUDED_EXTENSIONS = ['ics', 'vcf', 'p7s', 'asc', 'sig', 'eml', 'winmail.dat'];

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // ✅ FIX: Get authenticated user instead of hardcoded ID
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;  // ✅ Real user ID!

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') || 'date') as 'date' | 'name' | 'size' | 'sender' | 'type';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Parse array filters
    const fileTypes = searchParams.get('fileTypes')?.split(',').filter(Boolean) || [];
    const documentTypes = searchParams.get('documentTypes')?.split(',').filter(Boolean) || [];
    const senders = searchParams.get('senders')?.split(',').filter(Boolean) || [];
    
    // Parse date filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Parse direction filter (sent/received)
    const direction = searchParams.get('direction') as 'sent' | 'received' | null;

    // Build where conditions
    const conditions = [
      eq(attachments.userId, userId),
      // Exclude .ics, .vcf, and other non-document/media files
      notInArray(attachments.fileExtension, EXCLUDED_EXTENSIONS),
      // Exclude inline images (embedded in email body via cid: references)
      sql`(${attachments.isInline} IS NULL OR ${attachments.isInline} = false)`,
      sql`${attachments.contentId} IS NULL`,
    ];

    // Search filter (filename, sender, subject)
    if (search) {
      conditions.push(
        or(
          like(attachments.filename, `%${search}%`),
          like(attachments.senderEmail, `%${search}%`),
          like(attachments.senderName, `%${search}%`),
          like(attachments.emailSubject, `%${search}%`)
        )!
      );
    }

    // File type filter
    if (fileTypes.length > 0) {
      conditions.push(inArray(attachments.fileExtension, fileTypes));
    }

    // Document type filter
    if (documentTypes.length > 0) {
      conditions.push(inArray(attachments.documentType, documentTypes));
    }

    // Sender filter
    if (senders.length > 0) {
      conditions.push(inArray(attachments.senderEmail, senders));
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(attachments.emailDate, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(attachments.emailDate, new Date(dateTo)));
    }

    // Direction filter - filter by email folder (sent = 'sent' folder, received = not 'sent')
    if (direction === 'sent') {
      conditions.push(eq(emails.folder, 'sent'));
    } else if (direction === 'received') {
      conditions.push(sql`(${emails.folder} IS NULL OR ${emails.folder} != 'sent')`);
    }

    // Get total count with LEFT JOIN to emails for direction filtering
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attachments)
      .leftJoin(emails, eq(attachments.emailId, emails.id))
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Build order by
    const orderByColumn = {
      date: attachments.emailDate,
      name: attachments.filename,
      size: attachments.fileSizeBytes,
      sender: attachments.senderEmail,
      type: attachments.fileExtension,
    }[sortBy];

    const orderDirection = sortOrder === 'asc' ? asc : desc;

    // Fetch paginated data with email folder for direction badge
    const offset = (page - 1) * limit;
    const rawData = await db
      .select({
        attachment: attachments,
        emailFolder: emails.folder,
      })
      .from(attachments)
      .leftJoin(emails, eq(attachments.emailId, emails.id))
      .where(and(...conditions))
      .orderBy(orderDirection(orderByColumn))
      .limit(limit)
      .offset(offset);

    // Transform data to include direction field
    const data = rawData.map(row => ({
      ...row.attachment,
      direction: row.emailFolder === 'sent' ? 'sent' : 'received' as 'sent' | 'received',
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: data || [],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        search,
        fileTypes,
        documentTypes,
        senders,
        direction,
        dateRange: dateFrom && dateTo ? { from: new Date(dateFrom), to: new Date(dateTo) } : undefined,
      },
    });
  } catch (error: any) {
    console.error('Attachments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

