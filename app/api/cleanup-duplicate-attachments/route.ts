/**
 * Cleanup Duplicate Attachments API Route
 * DELETE /api/cleanup-duplicate-attachments
 *
 * Removes duplicate attachments from the attachments table.
 * Uses multiple detection methods to find ALL duplicates:
 * 1. Same nylas_attachment_id (exact Nylas duplicate)
 * 2. Same email_id + filename + file_size (logical duplicate)
 * 3. Same filename + file_size + sender across emails (potential duplicates)
 * The oldest record in each group is kept, duplicates are removed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface DuplicateGroup {
  groupKey: string;
  filename: string;
  count: number;
  ids: string[];
}

async function findAllDuplicates(userId: string): Promise<DuplicateGroup[]> {
  const allDuplicates: DuplicateGroup[] = [];
  const seenIds = new Set<string>();

  // Method 1: Find duplicates by nylas_attachment_id (exact Nylas duplicates)
  const nylasIdDuplicates = await db.execute(sql`
    SELECT
      nylas_attachment_id as group_key,
      MIN(filename) as filename,
      COUNT(*) as count,
      array_agg(id ORDER BY created_at ASC) as ids
    FROM attachments
    WHERE user_id = ${userId}
      AND nylas_attachment_id IS NOT NULL
    GROUP BY nylas_attachment_id
    HAVING COUNT(*) > 1
  `);

  const nylasRows = nylasIdDuplicates as unknown as any[];
  for (const row of nylasRows) {
    const ids = row.ids as string[];
    // Only include IDs we haven't seen
    const newIds = ids.filter((id: string) => !seenIds.has(id));
    if (newIds.length > 1) {
      allDuplicates.push({
        groupKey: `nylas:${row.group_key}`,
        filename: row.filename,
        count: newIds.length,
        ids: newIds,
      });
      newIds.forEach((id: string) => seenIds.add(id));
    }
  }

  // Method 2: Find duplicates by email_id + filename + file_size (logical duplicates within same email)
  const emailFileDuplicates = await db.execute(sql`
    SELECT
      CONCAT(email_id, ':', filename, ':', COALESCE(file_size_bytes::text, 'null')) as group_key,
      filename,
      COUNT(*) as count,
      array_agg(id ORDER BY created_at ASC) as ids
    FROM attachments
    WHERE user_id = ${userId}
      AND email_id IS NOT NULL
    GROUP BY email_id, filename, file_size_bytes
    HAVING COUNT(*) > 1
  `);

  const emailRows = emailFileDuplicates as unknown as any[];
  for (const row of emailRows) {
    const ids = (row.ids as string[]).filter((id: string) => !seenIds.has(id));
    if (ids.length > 1) {
      allDuplicates.push({
        groupKey: `email:${row.group_key}`,
        filename: row.filename,
        count: ids.length,
        ids: ids,
      });
      ids.forEach((id: string) => seenIds.add(id));
    }
  }

  // Method 3: Find duplicates by filename + file_size + mime_type (same file potentially attached to different emails)
  const fileDuplicates = await db.execute(sql`
    SELECT
      CONCAT(filename, ':', COALESCE(file_size_bytes::text, 'null'), ':', COALESCE(mime_type, 'unknown')) as group_key,
      filename,
      COUNT(*) as count,
      array_agg(id ORDER BY created_at ASC) as ids
    FROM attachments
    WHERE user_id = ${userId}
      AND filename IS NOT NULL
      AND file_size_bytes IS NOT NULL
    GROUP BY filename, file_size_bytes, mime_type
    HAVING COUNT(*) > 1
  `);

  const fileRows = fileDuplicates as unknown as any[];
  for (const row of fileRows) {
    const ids = (row.ids as string[]).filter((id: string) => !seenIds.has(id));
    if (ids.length > 1) {
      allDuplicates.push({
        groupKey: `file:${row.group_key}`,
        filename: row.filename,
        count: ids.length,
        ids: ids,
      });
      ids.forEach((id: string) => seenIds.add(id));
    }
  }

  return allDuplicates;
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    console.log(`🧹 Starting duplicate attachment cleanup for user: ${userId}`);

    // Find all duplicate groups using multiple detection methods
    const duplicateGroups = await findAllDuplicates(userId);

    if (duplicateGroups.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        duplicateGroups: 0,
        message: 'No duplicate attachments found',
      });
    }

    // Collect IDs to delete (keep first/oldest, delete the rest)
    const idsToDelete: string[] = [];
    for (const group of duplicateGroups) {
      // Skip the first ID (oldest), mark rest for deletion
      const duplicateIds = group.ids.slice(1);
      idsToDelete.push(...duplicateIds);
    }

    console.log(`Found ${duplicateGroups.length} duplicate groups with ${idsToDelete.length} total duplicates to remove`);
    console.log(`Groups breakdown:`, duplicateGroups.map(g => ({ key: g.groupKey, filename: g.filename, count: g.count })));

    // Delete duplicates in batches
    let totalDeleted = 0;
    const batchSize = 100;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const result = await db.delete(attachments)
        .where(and(
          eq(attachments.userId, userId),
          inArray(attachments.id, batch)
        ))
        .returning({ id: attachments.id });

      totalDeleted += result.length;
    }

    console.log(`🧹 Duplicate attachment cleanup complete. Deleted: ${totalDeleted}`);

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      duplicateGroups: duplicateGroups.length,
      message: `Successfully removed ${totalDeleted} duplicate attachments from ${duplicateGroups.length} groups`,
    });

  } catch (error: any) {
    console.error('Cleanup duplicate attachments error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicate attachments', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to preview what would be deleted (dry run)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Find all duplicate groups using multiple detection methods
    const duplicateGroups = await findAllDuplicates(userId);

    // Calculate total duplicates (excluding the one we keep from each group)
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0);

    // Get sample duplicates for display (show more details)
    const samples = duplicateGroups.slice(0, 10).map(group => ({
      filename: group.filename,
      count: group.count,
      type: group.groupKey.split(':')[0], // nylas, email, or file
    }));

    return NextResponse.json({
      success: true,
      preview: {
        duplicateGroups: duplicateGroups.length,
        totalDuplicates,
        samples,
      },
      message: totalDuplicates > 0
        ? `Found ${totalDuplicates} duplicate attachments in ${duplicateGroups.length} groups`
        : 'No duplicate attachments found',
    });

  } catch (error: any) {
    console.error('Preview duplicate attachments error:', error);
    return NextResponse.json(
      { error: 'Failed to preview duplicate attachments', details: error.message },
      { status: 500 }
    );
  }
}
