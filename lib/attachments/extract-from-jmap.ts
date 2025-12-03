/**
 * Attachment Extraction Helper for JMAP Email Sync
 *
 * ✅ ON-DEMAND MODE: Only saves metadata, attachments fetched from JMAP when needed
 * - No downloads during sync (faster sync)
 * - No storage costs (zero storage usage)
 * - Always up-to-date (JMAP/Fastmail is source of truth)
 */

import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { shouldIndexAttachment } from './attachment-filter';

interface JMAPAttachment {
  blobId: string;
  name?: string;
  size?: number;
  type?: string;
  cid?: string;
  disposition?: 'attachment' | 'inline';
}

interface ExtractJMAPAttachmentsParams {
  emailId: string; // Database email ID
  providerMessageId: string; // JMAP message ID
  accountId: string;
  userId: string;
  attachments: JMAPAttachment[];
  emailSubject?: string;
  senderEmail?: string;
  senderName?: string;
  emailDate?: Date;
}

export async function extractAndSaveJMAPAttachments({
  emailId,
  providerMessageId,
  accountId,
  userId,
  attachments: jmapAttachments,
  emailSubject,
  senderEmail,
  senderName,
  emailDate,
}: ExtractJMAPAttachmentsParams) {
  if (!jmapAttachments || jmapAttachments.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 };
  }

  console.log(`📎 [JMAP] Starting attachment extraction for message: ${providerMessageId}`);
  console.log(`📎 [JMAP] Found ${jmapAttachments.length} attachment(s)`);

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const att of jmapAttachments) {
    try {
      const filename = att.name || `attachment-${Date.now()}`;
      const contentType = att.type || 'application/octet-stream';
      const size = att.size || 0;
      const blobId = att.blobId;

      console.log(`📎 [JMAP] Processing: ${filename} (${size} bytes, type: ${contentType})`);

      // Skip inline images (used in email body via cid: references)
      const isInline = att.disposition === 'inline' || !!att.cid;

      if (isInline) {
        skipped++;
        console.log(`⏭️  [JMAP] Skipping inline: ${filename}`);
        continue;
      }

      // Skip very large files (>20MB)
      if (size > 20 * 1024 * 1024) {
        skipped++;
        console.log(`⏭️  [JMAP] Skipping large file: ${filename} (${size} bytes)`);
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
        console.log(`⏭️  [JMAP] Excluding: ${filename} - ${indexCheck.reason}`);
        continue;
      }

      // Get file extension
      const extension = filename.split('.').pop()?.toLowerCase() || '';

      // Save metadata only - attachments fetched on-demand from JMAP
      console.log(`💾 [JMAP] Saving metadata (on-demand mode): ${filename}`);

      await db.insert(attachments).values({
        userId,
        emailId,
        accountId,
        filename: filename,
        fileExtension: extension,
        mimeType: contentType,
        fileSizeBytes: size,
        // JMAP IDs for on-demand fetching (store blobId in nylasAttachmentId field for compatibility)
        nylasAttachmentId: blobId,
        nylasMessageId: providerMessageId,
        nylasGrantId: accountId, // Use accountId as grantId for JMAP
        // Email context
        emailSubject: emailSubject || '(No Subject)',
        senderEmail: senderEmail || '',
        senderName: senderName || '',
        emailDate: emailDate || new Date(),
        processingStatus: 'pending',
        aiProcessed: false,
      }).onConflictDoNothing(); // Skip if already exists

      saved++;
      console.log(`✅ [JMAP] Saved metadata to database: ${filename}`);

    } catch (error: any) {
      failed++;
      const filename = att.name || 'unknown';
      console.error(`❌ [JMAP] Failed to save ${filename}:`, {
        error: error.message,
        blobId: att.blobId,
      });
    }
  }

  console.log(`📎 [JMAP] Extraction complete: ${saved} saved, ${skipped} skipped, ${failed} failed`);
  return { saved, skipped, failed };
}
