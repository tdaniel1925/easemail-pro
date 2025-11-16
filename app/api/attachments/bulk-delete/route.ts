/**
 * Bulk Delete Attachments API Route
 * POST /api/attachments/bulk-delete
 *
 * Deletes multiple attachments or all attachments matching filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { eq, and, inArray, like, gte, lte, or, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import type { GetAttachmentsParams } from '@/lib/attachments/types';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json();
    const { attachmentIds, deleteAll, filters } = body;

    let deletedCount = 0;

    if (deleteAll && filters) {
      // Delete all attachments matching the filters
      const params: GetAttachmentsParams = filters;

      // Build the where conditions
      const conditions = [eq(attachments.userId, userId)];

      // Search filter
      if (params.search) {
        conditions.push(
          or(
            like(attachments.filename, `%${params.search}%`),
            like(attachments.summary, `%${params.search}%`)
          )!
        );
      }

      // File type filter
      if (params.fileTypes && params.fileTypes.length > 0) {
        conditions.push(inArray(attachments.fileExtension, params.fileTypes));
      }

      // Document type filter
      if (params.documentTypes && params.documentTypes.length > 0) {
        conditions.push(inArray(attachments.documentType, params.documentTypes));
      }

      // Sender filter
      if (params.senders && params.senders.length > 0) {
        conditions.push(inArray(attachments.sender, params.senders));
      }

      // Date range filter
      if (params.dateFrom) {
        conditions.push(gte(attachments.createdAt, new Date(params.dateFrom)));
      }
      if (params.dateTo) {
        conditions.push(lte(attachments.createdAt, new Date(params.dateTo)));
      }

      // Delete attachments matching filters
      const result = await db
        .delete(attachments)
        .where(and(...conditions))
        .returning({ id: attachments.id });

      deletedCount = result.length;

      console.log(`[Bulk Delete] Deleted ${deletedCount} attachments matching filters for user ${userId}`);
    } else if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
      // Delete specific attachments
      const result = await db
        .delete(attachments)
        .where(
          and(
            eq(attachments.userId, userId),
            inArray(attachments.id, attachmentIds)
          )
        )
        .returning({ id: attachments.id });

      deletedCount = result.length;

      console.log(`[Bulk Delete] Deleted ${deletedCount} specific attachments for user ${userId}`);
    } else {
      return NextResponse.json(
        { error: 'Either attachmentIds or deleteAll with filters must be provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} attachment(s)`,
    });
  } catch (error: any) {
    console.error('[Bulk Delete API Error]:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete attachments',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
