import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check attachment data in database
 * GET /api/debug/attachments
 */
export async function GET(request: NextRequest) {
  try {
    // Get 5 emails that should have attachments
    const emailsWithAttachments = await db.query.emails.findMany({
      where: eq(emails.hasAttachments, true),
      limit: 5,
    });

    const debugInfo = emailsWithAttachments.map(email => ({
      id: email.id,
      subject: email.subject,
      fromEmail: email.fromEmail,
      hasAttachments: email.hasAttachments,
      attachmentsCount: email.attachmentsCount,
      attachmentsData: email.attachments,
      attachmentsIsNull: email.attachments === null,
      attachmentsIsUndefined: email.attachments === undefined,
      attachmentsIsArray: Array.isArray(email.attachments),
      attachmentsLength: Array.isArray(email.attachments) ? email.attachments.length : 'N/A',
    }));

    return NextResponse.json({
      success: true,
      totalEmailsChecked: emailsWithAttachments.length,
      emails: debugInfo,
    });
  } catch (error) {
    console.error('Debug attachments error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
