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
  // Check if message has attachments (Nylas API uses 'attachments' not 'files')
  if (!message.attachments || message.attachments.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 };
  }

  console.log(`📎 Starting attachment extraction for message: ${message.id}`);
  console.log(`📎 Found ${message.attachments.length} attachment(s)`);

  const supabase = await createClient();
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

      // Download attachment from Nylas
      console.log(`📥 Downloading from Nylas: ${filename}`);
      const attachmentResponse = await nylas.attachments.download({
        identifier: grantId,
        attachmentId: fileId,
        queryParams: {
          messageId: message.id,
        },
      });

      if (!attachmentResponse) {
        throw new Error('Empty response from Nylas download');
      }

      console.log(`✅ Downloaded ${filename}, size: ${attachmentResponse instanceof Buffer ? attachmentResponse.length : 'unknown'} bytes`);

      // Upload to Supabase Storage
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
      const storagePath = `${userId}/${message.id}/${sanitizedFilename}`;
      
      console.log(`☁️  Uploading to Supabase: ${storagePath}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, attachmentResponse, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
        });

      if (uploadError) {
        // If file already exists, skip it
        if (uploadError.message.includes('already exists') || uploadError.message.includes('duplicate')) {
          skipped++;
          console.log(`⏭️  Already exists: ${filename}`);
          continue;
        }
        throw uploadError;
      }

      console.log(`✅ Uploaded to Supabase: ${filename}`);

      // Get file extension
      const extension = filename.split('.').pop()?.toLowerCase() || '';

      // Create attachment record
      await db.insert(attachments).values({
        userId,
        emailId: emailRecord.id,
        accountId,
        filename: filename,
        fileExtension: extension,
        mimeType: contentType,
        fileSizeBytes: size,
        storagePath,
        emailSubject: message.subject || '(No Subject)',
        senderEmail: message.from?.[0]?.email || '',
        senderName: message.from?.[0]?.name || '',
        emailDate: new Date(message.date * 1000),
        processingStatus: 'pending',
        aiProcessed: false,
      });

      saved++;
      console.log(`✅ Saved to database: ${filename}`);

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

