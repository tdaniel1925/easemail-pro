/**
 * Attachment Extraction Helper for Email Sync
 * Add this to your Nylas sync after saving each email
 */

import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import type Nylas from 'nylas';

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
  // Check if message has attachments
  if (!message.files || message.files.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 };
  }

  const supabase = createClient();
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of message.files) {
    try {
      // Skip inline images and very large files
      if (file.content_disposition === 'inline') {
        skipped++;
        console.log(`⏭️  Skipping inline: ${file.filename}`);
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        skipped++;
        console.log(`⏭️  Skipping large file: ${file.filename} (${file.size} bytes)`);
        continue;
      }

      // Download attachment from Nylas
      console.log(`📥 Downloading: ${file.filename}`);
      const attachmentResponse = await nylas.messages.downloadAttachment({
        identifier: grantId,
        messageId: message.id,
        attachmentId: file.id,
      });

      // Upload to Supabase Storage
      const storagePath = `${userId}/${message.id}/${file.filename}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, attachmentResponse, {
          contentType: file.content_type,
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
        });

      if (uploadError) {
        // If file already exists, skip it
        if (uploadError.message.includes('already exists')) {
          skipped++;
          console.log(`⏭️  Already exists: ${file.filename}`);
          continue;
        }
        throw uploadError;
      }

      // Get file extension
      const extension = file.filename?.split('.').pop()?.toLowerCase();

      // Create attachment record
      await db.insert(attachments).values({
        userId,
        emailId: emailRecord.id,
        accountId,
        filename: file.filename || 'unnamed',
        fileExtension: extension,
        mimeType: file.content_type,
        fileSizeBytes: file.size,
        storagePath,
        emailSubject: message.subject,
        senderEmail: message.from?.[0]?.email,
        senderName: message.from?.[0]?.name,
        emailDate: new Date(message.date * 1000),
        processingStatus: 'pending',
        aiProcessed: false,
      });

      saved++;
      console.log(`✅ Saved: ${file.filename}`);

    } catch (error: any) {
      failed++;
      console.error(`❌ Failed to save ${file.filename}:`, error.message);
    }
  }

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

