/**
 * Cleanup API: Remove Excluded Attachments
 * DELETE /api/attachments/cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { attachments } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

// Excluded file extensions (matches attachment-filter.ts)
const EXCLUDED_EXTENSIONS = ['ics', 'vcf', 'p7s', 'asc', 'sig', 'eml', 'winmail.dat'];

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔧 Starting cleanup of excluded attachments...');

    // First, count how many attachments will be deleted
    const excludedAttachments = await db
      .select()
      .from(attachments)
      .where(inArray(attachments.fileExtension, EXCLUDED_EXTENSIONS));

    console.log(`📊 Found ${excludedAttachments.length} excluded attachments`);

    // Group by extension for reporting
    const byExtension = excludedAttachments.reduce((acc: Record<string, number>, att) => {
      acc[att.fileExtension || 'unknown'] = (acc[att.fileExtension || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    if (excludedAttachments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No excluded attachments found',
        deleted: 0,
        breakdown: {},
      });
    }

    // Delete excluded attachments
    console.log('🗑️  Deleting excluded attachments...');
    await db
      .delete(attachments)
      .where(inArray(attachments.fileExtension, EXCLUDED_EXTENSIONS));

    console.log(`✅ Successfully deleted ${excludedAttachments.length} excluded attachments`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${excludedAttachments.length} excluded attachments`,
      deleted: excludedAttachments.length,
      breakdown: byExtension,
      excludedExtensions: EXCLUDED_EXTENSIONS,
    });
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup attachments',
      },
      { status: 500 }
    );
  }
}
