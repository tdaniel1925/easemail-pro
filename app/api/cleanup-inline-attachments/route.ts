/**
 * Cleanup Inline Attachments API Route
 * DELETE /api/cleanup-inline-attachments
 *
 * Removes inline images/attachments from the attachments table.
 * Inline attachments are embedded images (pasted or included in email body)
 * that shouldn't appear in the Attachments page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments, emails } from '@/lib/db/schema';
import { eq, and, or, isNotNull, sql, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

// Common inline image filename patterns
const INLINE_FILENAME_PATTERNS = [
  /^image\d+\.(png|jpg|jpeg|gif)$/i,          // image001.png, image1.jpg
  /^unnamed\.(png|jpg|jpeg|gif)$/i,           // unnamed.png
  /^inline-\d+\.(png|jpg|jpeg|gif)$/i,        // inline-1.png
  /^pastedImage\d*\.(png|jpg|jpeg|gif)$/i,    // pastedImage.png
  /^Untitled\.(png|jpg|jpeg|gif)$/i,          // Untitled.png
  /^cid_.*\.(png|jpg|jpeg|gif)$/i,            // cid_xxx.png
  /^ATT\d+\.(png|jpg|jpeg|gif)$/i,            // ATT00001.png (Outlook)
  /^pasted-from-clipboard\.(png|jpg|jpeg|gif)$/i, // clipboard paste
];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    console.log(`🧹 Starting inline attachment cleanup for user: ${userId}`);

    // Step 1: Delete attachments where isInline = true
    const inlineDeleted = await db.delete(attachments)
      .where(and(
        eq(attachments.userId, userId),
        eq(attachments.isInline, true)
      ))
      .returning({ id: attachments.id });

    console.log(`✅ Deleted ${inlineDeleted.length} attachments marked as inline`);

    // Step 2: Delete attachments with content_id (CID) - these are inline images
    const cidDeleted = await db.delete(attachments)
      .where(and(
        eq(attachments.userId, userId),
        isNotNull(attachments.contentId)
      ))
      .returning({ id: attachments.id });

    console.log(`✅ Deleted ${cidDeleted.length} attachments with content IDs`);

    // Step 3: Find and delete attachments matching inline filename patterns
    // First, get all image attachments
    const imageAttachments = await db.select({
      id: attachments.id,
      filename: attachments.filename,
    })
    .from(attachments)
    .where(and(
      eq(attachments.userId, userId),
      inArray(attachments.fileExtension, ['png', 'jpg', 'jpeg', 'gif'])
    ));

    // Filter by inline filename patterns
    const inlinePatternIds = imageAttachments
      .filter(att => INLINE_FILENAME_PATTERNS.some(pattern => pattern.test(att.filename)))
      .map(att => att.id);

    let patternDeleted: { id: string }[] = [];
    if (inlinePatternIds.length > 0) {
      patternDeleted = await db.delete(attachments)
        .where(and(
          eq(attachments.userId, userId),
          inArray(attachments.id, inlinePatternIds)
        ))
        .returning({ id: attachments.id });
    }

    console.log(`✅ Deleted ${patternDeleted.length} attachments matching inline filename patterns`);

    // Step 4: Delete very small images (< 10KB) that are likely tracking pixels or inline icons
    const smallImagesDeleted = await db.delete(attachments)
      .where(and(
        eq(attachments.userId, userId),
        inArray(attachments.fileExtension, ['png', 'jpg', 'jpeg', 'gif']),
        sql`${attachments.fileSizeBytes} < 10240` // 10KB
      ))
      .returning({ id: attachments.id });

    console.log(`✅ Deleted ${smallImagesDeleted.length} very small images (< 10KB)`);

    const totalDeleted = inlineDeleted.length + cidDeleted.length + patternDeleted.length + smallImagesDeleted.length;

    console.log(`🧹 Inline attachment cleanup complete. Total deleted: ${totalDeleted}`);

    return NextResponse.json({
      success: true,
      deleted: {
        inlineFlag: inlineDeleted.length,
        contentId: cidDeleted.length,
        filenamePattern: patternDeleted.length,
        smallImages: smallImagesDeleted.length,
        total: totalDeleted,
      },
      message: `Successfully removed ${totalDeleted} inline attachments`,
    });

  } catch (error: any) {
    console.error('Cleanup inline attachments error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup inline attachments', details: error.message },
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

    // Count attachments marked as inline
    const inlineCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(attachments)
      .where(and(
        eq(attachments.userId, userId),
        eq(attachments.isInline, true)
      ));

    // Count attachments with content_id
    const cidCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(attachments)
      .where(and(
        eq(attachments.userId, userId),
        isNotNull(attachments.contentId)
      ));

    // Count image attachments matching inline patterns
    const imageAttachments = await db.select({
      id: attachments.id,
      filename: attachments.filename,
    })
    .from(attachments)
    .where(and(
      eq(attachments.userId, userId),
      inArray(attachments.fileExtension, ['png', 'jpg', 'jpeg', 'gif'])
    ));

    const patternMatchCount = imageAttachments
      .filter(att => INLINE_FILENAME_PATTERNS.some(pattern => pattern.test(att.filename)))
      .length;

    // Count very small images
    const smallImagesCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(attachments)
      .where(and(
        eq(attachments.userId, userId),
        inArray(attachments.fileExtension, ['png', 'jpg', 'jpeg', 'gif']),
        sql`${attachments.fileSizeBytes} < 10240`
      ));

    const total = (inlineCount[0]?.count || 0) +
                  (cidCount[0]?.count || 0) +
                  patternMatchCount +
                  (smallImagesCount[0]?.count || 0);

    return NextResponse.json({
      success: true,
      preview: {
        inlineFlag: inlineCount[0]?.count || 0,
        contentId: cidCount[0]?.count || 0,
        filenamePattern: patternMatchCount,
        smallImages: smallImagesCount[0]?.count || 0,
        total,
      },
      message: `Found ${total} inline attachments that would be removed`,
    });

  } catch (error: any) {
    console.error('Preview inline attachments error:', error);
    return NextResponse.json(
      { error: 'Failed to preview inline attachments', details: error.message },
      { status: 500 }
    );
  }
}
