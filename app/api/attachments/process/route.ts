/**
 * AI Attachment Processor
 * Background job to classify and extract data from attachments
 * 
 * POST /api/attachments/process
 * - Processes pending attachments in queue
 * - Downloads files from storage
 * - Runs AI classification & extraction
 * - Updates database with results
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments, userPreferences } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { processAttachment } from '@/lib/attachments/ai-service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Secure this endpoint - only allow internal calls or authenticated admin users
const PROCESSING_BATCH_SIZE = 10;
const MAX_FILE_SIZE_MB = 20;

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header (for security)
    const authHeader = request.headers.get('authorization');
    const processingKey = process.env.ATTACHMENT_PROCESSING_KEY || 'dev-key';
    
    if (authHeader !== `Bearer ${processingKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID (in production, get from session)
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user
    
    // Check if user has AI processing enabled
    const userPrefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (!userPrefs?.aiAttachmentProcessing) {
      return NextResponse.json({
        success: false,
        message: 'AI attachment processing is disabled for this user. Enable it in Settings.',
        processed: 0,
      });
    }

    // Get pending attachments to process
    const pendingAttachments = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.userId, userId),
          eq(attachments.processingStatus, 'pending'),
          eq(attachments.aiProcessed, false)
        )
      )
      .limit(PROCESSING_BATCH_SIZE);

    if (pendingAttachments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending attachments to process',
        processed: 0,
      });
    }

    console.log(`🤖 Processing ${pendingAttachments.length} attachments...`);

    // Initialize Supabase client for storage
    const supabase = await createClient();
    const results = [];

    // Process each attachment
    for (const attachment of pendingAttachments) {
      try {
        console.log(`📄 Processing: ${attachment.filename}`);

        // Update status to processing
        await db
          .update(attachments)
          .set({ processingStatus: 'processing' })
          .where(eq(attachments.id, attachment.id));

        // Download file from storage
        if (!attachment.storagePath) {
          throw new Error('No storage path available for attachment');
        }

        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('attachments')
          .download(attachment.storagePath);

        if (downloadError) {
          throw new Error(`Download failed: ${downloadError.message}`);
        }

        // Check file size
        const fileSizeBytes = await fileData.size;
        if (fileSizeBytes > MAX_FILE_SIZE_MB * 1024 * 1024) {
          throw new Error(`File too large: ${fileSizeBytes} bytes`);
        }

        // Convert to buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Run AI processing
        console.log(`🧠 Running AI classification...`);
        const result = await processAttachment(
          {
            id: attachment.id,
            filename: attachment.filename,
            fileExtension: attachment.fileExtension || '',
            mimeType: attachment.mimeType || '',
            fileSizeBytes: Number(attachment.fileSizeBytes),
            userId: attachment.userId,
            emailId: attachment.emailId || null,
            accountId: attachment.accountId || null,
            storagePath: attachment.storagePath || '',
            storageUrl: attachment.storageUrl || null,
            thumbnailPath: attachment.thumbnailPath || null,
            thumbnailUrl: attachment.thumbnailUrl || null,
            emailSubject: attachment.emailSubject || null,
            senderEmail: attachment.senderEmail || null,
            senderName: attachment.senderName || null,
            emailDate: attachment.emailDate || null,
            threadId: attachment.threadId || null,
            documentType: (attachment.documentType as any) || null,
            classificationConfidence: attachment.classificationConfidence || null,
            extractedMetadata: attachment.extractedMetadata as any,
            keyTerms: attachment.keyTerms as string[],
            aiProcessed: !!attachment.aiProcessed,
            processingStatus: attachment.processingStatus || 'pending',
            processingError: attachment.processingError || null,
            processedAt: attachment.processedAt || null,
            createdAt: attachment.createdAt,
            updatedAt: attachment.updatedAt,
          },
          fileBuffer
        );

        // Update attachment with AI results
        await db
          .update(attachments)
          .set({
            documentType: result.documentType,
            classificationConfidence: Math.round(result.confidence * 100),
            extractedMetadata: result.extractedMetadata as any,
            keyTerms: result.keyTerms as string[],
            aiProcessed: true,
            processingStatus: 'completed',
            processedAt: new Date(),
            processingError: result.error || null,
          })
          .where(eq(attachments.id, attachment.id));

        console.log(`✅ Processed: ${attachment.filename} → ${result.documentType}`);

        results.push({
          id: attachment.id,
          filename: attachment.filename,
          documentType: result.documentType,
          confidence: result.confidence,
          success: true,
        });

      } catch (error: any) {
        console.error(`❌ Failed to process ${attachment.filename}:`, error);

        // Update with error status
        await db
          .update(attachments)
          .set({
            processingStatus: 'failed',
            processingError: error.message,
            aiProcessed: false,
          })
          .where(eq(attachments.id, attachment.id));

        results.push({
          id: attachment.id,
          filename: attachment.filename,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`🎉 Processing complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: failCount,
      results,
    });

  } catch (error: any) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process attachments', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';

    // Get processing stats
    const [pending, processing, completed, failed] = await Promise.all([
      db.select().from(attachments).where(
        and(eq(attachments.userId, userId), eq(attachments.processingStatus, 'pending'))
      ),
      db.select().from(attachments).where(
        and(eq(attachments.userId, userId), eq(attachments.processingStatus, 'processing'))
      ),
      db.select().from(attachments).where(
        and(eq(attachments.userId, userId), eq(attachments.processingStatus, 'completed'))
      ),
      db.select().from(attachments).where(
        and(eq(attachments.userId, userId), eq(attachments.processingStatus, 'failed'))
      ),
    ]);

    return NextResponse.json({
      stats: {
        pending: pending.length,
        processing: processing.length,
        completed: completed.length,
        failed: failed.length,
        total: pending.length + processing.length + completed.length + failed.length,
      },
      queue: pending.slice(0, 10).map(a => ({
        id: a.id,
        filename: a.filename,
        createdAt: a.createdAt,
      })),
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

