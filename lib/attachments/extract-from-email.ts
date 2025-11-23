/**
 * Attachment Extraction Helper for Email Sync
 *
 * ✅ ON-DEMAND MODE: Only saves metadata, attachments fetched from Nylas when needed
 * - No downloads during sync (faster sync)
 * - No storage costs (zero Supabase storage usage)
 * - Always up-to-date (Nylas is source of truth)
 */

import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import type Nylas from 'nylas';
import { shouldIndexAttachment } from './attachment-filter';

interface ExtractAttachmentsParams {
  message: any; // Nylas message object
  emailRecord: { id: string };
  accountId: string;
  userId: string;
  grantId: string;
  nylas: Nylas;
}

export async function extractAndSaveAttachments({
  message,
  emailRecord,
  accountId,
  userId,
  grantId,
  nylas,
}: ExtractAttachmentsParams) {
  // Check if message has attachments (Nylas API uses 'attachments' not 'files')
  if (!message.attachments || message.attachments.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 };
  }

  console.log(`📎 Starting attachment extraction for message: ${message.id}`);
  console.log(`📎 Found ${message.attachments.length} attachment(s)`);

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of message.attachments) {
    try {
      // Defensive: Get filename with multiple fallbacks
      const filename = file.filename || file.name || `attachment-${Date.now()}`;
      const contentType = file.contentType || file.content_type || file.mimeType || 'application/octet-stream';
      const size = file.size || 0;
      const fileId = file.id;

      console.log(`📎 Processing: ${filename} (${size} bytes, type: ${contentType})`);

      // Skip inline images and very large files
      const isInline = file.contentDisposition === 'inline' || 
                       file.content_disposition === 'inline' || 
                       file.isInline === true ||
                       file.is_inline === true;

      if (isInline) {
        skipped++;
        console.log(`⏭️  Skipping inline: ${filename}`);
        continue;
      }

      if (size > 20 * 1024 * 1024) {
        skipped++;
        console.log(`⏭️  Skipping large file: ${filename} (${size} bytes)`);
        continue;
      }

      // Check if attachment should be indexed (exclude .ics, .vcf, signatures, etc.)
      const indexCheck = shouldIndexAttachment({
        filename,
        contentType,
        isInline,
        size,
      });

      if (!indexCheck.shouldIndex) {
        skipped++;
        console.log(`⏭️  Excluding: ${filename} - ${indexCheck.reason}`);
        continue;
      }

      // Get file extension
      const extension = filename.split('.').pop()?.toLowerCase() || '';

      // ✅ NEW APPROACH: Save metadata only - NO downloading/uploading
      // Attachments will be fetched on-demand from Nylas when user requests preview/download
      console.log(`💾 Saving metadata (on-demand mode): ${filename}`);

      // Create attachment record with Nylas IDs
      await db.insert(attachments).values({
        userId,
        emailId: emailRecord.id,
        accountId,
        filename: filename,
        fileExtension: extension,
        mimeType: contentType,
        fileSizeBytes: size,
        // Nylas IDs for on-demand fetching
        nylasAttachmentId: fileId,
        nylasMessageId: message.id,
        nylasGrantId: grantId,
        // Email context
        emailSubject: message.subject || '(No Subject)',
        senderEmail: message.from?.[0]?.email || '',
        senderName: message.from?.[0]?.name || '',
        emailDate: new Date(message.date * 1000),
        processingStatus: 'pending',
        aiProcessed: false,
      });

      saved++;
      console.log(`✅ Saved metadata to database: ${filename}`);

    } catch (error: any) {
      failed++;
      const filename = file.filename || file.name || 'unknown';
      console.error(`❌ Failed to save ${filename}:`, {
        error: error.message,
        stack: error.stack?.substring(0, 200),
        file: {
          id: file.id,
          filename: file.filename,
          size: file.size,
          contentType: file.contentType,
        }
      });
    }
  }

  console.log(`📎 Extraction complete: ${saved} saved, ${skipped} skipped, ${failed} failed`);
  return { saved, skipped, failed };
}

/**
 * Usage in your Nylas sync:
 * 
 * // After saving the email:
 * const emailRecord = await db.insert(emails).values({ ... }).returning();
 * 
 * // Extract attachments:
 * const attachmentResult = await extractAndSaveAttachments({
 *   message,
 *   emailRecord: emailRecord[0],
 *   accountId: account.id,
 *   userId: account.userId,
 *   grantId,
 *   nylas,
 * });
 * 
 * console.log(`📎 Attachments: ${attachmentResult.saved} saved, ${attachmentResult.skipped} skipped, ${attachmentResult.failed} failed`);
 */

