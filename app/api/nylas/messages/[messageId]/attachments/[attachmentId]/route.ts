import { NextRequest, NextResponse } from 'next/server';
import { nylas } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ messageId: string; attachmentId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Authenticate user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, attachmentId } = await context.params;
    const accountId = request.nextUrl.searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Get email account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify account belongs to user
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get email to find provider message ID
    const email = await db.query.emails.findFirst({
      where: eq(emails.id, messageId),
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    console.log('📎 Downloading attachment:', {
      messageId: email.providerMessageId,
      attachmentId,
      provider: account.emailProvider,
    });

    // Download attachment from Nylas
    if (account.emailProvider === 'nylas' && account.nylasGrantId) {
      try {
        const attachment = await nylas.attachments.download({
          identifier: account.nylasGrantId,
          attachmentId: attachmentId,
          queryParams: {
            messageId: email.providerMessageId,
          },
        });

        console.log('✅ Attachment downloaded');

        // Find attachment metadata from email
        const attachmentMeta = email.attachments?.find((a: any) => a.id === attachmentId);
        const filename = attachmentMeta?.filename || 'download';
        const contentType = attachmentMeta?.contentType || 'application/octet-stream';

        // Convert ReadableStream to Buffer
        const reader = attachment.getReader();
        const chunks: Uint8Array[] = [];
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        
        const buffer = Buffer.concat(chunks);

        // Return the file
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } catch (error: any) {
        console.error('❌ Nylas download error:', error);
        return NextResponse.json({ 
          error: 'Failed to download attachment from Nylas',
          details: error.message 
        }, { status: 500 });
      }
    } else if (account.emailProvider === 'aurinko') {
      // TODO: Implement Aurinko attachment download
      return NextResponse.json({ 
        error: 'Aurinko attachment download not yet implemented' 
      }, { status: 501 });
    } else {
      return NextResponse.json(
        { error: 'Email provider not configured' }, 
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Download attachment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download attachment', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

