import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emails, emailAccounts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { nylas } from '@/lib/email/nylas-client';
import { sanitizeText } from '@/lib/utils/text-sanitizer';

export const dynamic = 'force-dynamic';

/**
 * Fix emails that have hasAttachments=true but attachments=null
 * This backfills attachment data by fetching from Nylas
 * GET /api/fix-attachments?limit=10
 */
export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

  try {
    // Find emails with hasAttachments=true but attachments is null
    const brokenEmails = await db.query.emails.findMany({
      where: and(
        eq(emails.hasAttachments, true),
        isNull(emails.attachments)
      ),
      limit,
      with: {
        account: true,
      },
    });

    console.log(`Found ${brokenEmails.length} emails with null attachments to fix`);

    let fixed = 0;
    let errors = 0;

    for (const email of brokenEmails) {
      try {
        if (!email.account?.nylasGrantId || !email.providerMessageId) {
          console.log(`Skipping email ${email.id} - missing grant ID or provider message ID`);
          errors++;
          continue;
        }

        // Fetch full message from Nylas
        console.log(`Fetching message ${email.providerMessageId} from Nylas...`);
        const nylasMessage = await nylas.messages.find({
          identifier: email.account.nylasGrantId,
          messageId: email.providerMessageId,
        });

        // Extract attachments
        const mappedAttachments = nylasMessage.data.attachments?.map((att: any) => ({
          id: sanitizeText(att.id) || '',
          filename: sanitizeText(att.filename) || 'untitled',
          size: att.size || 0,
          contentType: sanitizeText(att.contentType) || 'application/octet-stream',
          contentId: sanitizeText(att.contentId),
          url: sanitizeText(att.url),
          providerFileId: sanitizeText(att.id),
        })) || [];

        // Update email with attachment data
        await db.update(emails)
          .set({
            attachments: mappedAttachments,
            attachmentsCount: mappedAttachments.length,
            hasAttachments: mappedAttachments.length > 0,
            updatedAt: new Date(),
          })
          .where(eq(emails.id, email.id));

        console.log(`Fixed email ${email.id}: ${mappedAttachments.length} attachments`);
        fixed++;
      } catch (error) {
        console.error(`Error fixing email ${email.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      checked: brokenEmails.length,
      fixed,
      errors,
    });
  } catch (error) {
    console.error('Fix attachments error:', error);
    return NextResponse.json({
      error: 'Fix failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
