/**
 * Cleanup Duplicate Attachments API Route
 * DELETE /api/cleanup-duplicate-attachments
 *
 * Removes duplicate attachments from the attachments table.
 * Duplicates are identified by matching emailId + filename + fileSizeBytes.
 * The oldest record is kept, duplicates are removed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface DuplicateGroup {
  emailId: string;
  filename: string;
  fileSizeBytes: number;
  count: number;
  ids: string[];
}

async function findDuplicates(userId: string): Promise<DuplicateGroup[]> {
  // Find groups of attachments with the same emailId, filename, and size
  const duplicateGroups = await db.execute(sql`
    SELECT
      email_id,
      filename,
      file_size_bytes,
      COUNT(*) as count,
      array_agg(id ORDER BY created_at ASC) as ids
    FROM attachments
    WHERE user_id = ${userId}
    GROUP BY email_id, filename, file_size_bytes
    HAVING COUNT(*) > 1
  `);

  // Cast to array - db.execute returns the rows directly
  const rows = duplicateGroups as unknown as any[];
  return rows.map(row => ({
    emailId: row.email_id,
    filename: row.filename,
    fileSizeBytes: row.file_size_bytes,
    count: parseInt(row.count),
    ids: row.ids,
  }));
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

    // Find all duplicate groups
    const duplicateGroups = await findDuplicates(userId);

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

    // Find all duplicate groups
    const duplicateGroups = await findDuplicates(userId);

    // Calculate total duplicates (excluding the one we keep from each group)
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0);

    // Get sample duplicates for display
    const samples = duplicateGroups.slice(0, 5).map(group => ({
      filename: group.filename,
      count: group.count,
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
