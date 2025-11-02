import { NextRequest, NextResponse } from 'next/server';
import { sendNylasEmail } from '@/lib/email/nylas-client';
import { sendAurinkoEmail } from '@/lib/email/aurinko-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { 
      accountId, 
      to, 
      cc, 
      bcc, 
      subject, 
      body: emailBody, 
      replyToEmailId,
      attachments 
    } = body;

    // Validation
    if (!accountId || !to || to.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId and to' }, 
        { status: 400 }
      );
    }

    // 3. Get email account
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

    console.log('📤 Sending email:', {
      from: account.emailAddress,
      to,
      subject,
      provider: account.emailProvider,
    });

    // 4. Parse recipients (convert strings to objects if needed)
    const parseRecipients = (recipients: any) => {
      if (!recipients) return [];
      if (typeof recipients === 'string') {
        return recipients.split(',').map((email: string) => ({
          email: email.trim(),
        }));
      }
      if (Array.isArray(recipients)) {
        return recipients.map((r: any) => 
          typeof r === 'string' ? { email: r } : r
        );
      }
      return [];
    };

    const parsedTo = parseRecipients(to);
    const parsedCc = parseRecipients(cc);
    const parsedBcc = parseRecipients(bcc);

    console.log('📧 Parsed recipients:', {
      originalTo: to,
      parsedTo,
      parsedCc,
      parsedBcc,
    });

    // Process attachments - download and convert to base64 for Nylas
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      console.log(`📎 Processing ${attachments.length} attachment(s)...`);
      
      for (const attachment of attachments) {
        try {
          console.log(`📎 Fetching attachment from: ${attachment.url.substring(0, 100)}...`);
          
          // Fetch the file from URL
          const response = await fetch(attachment.url);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch attachment: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          console.log(`📎 Blob size: ${blob.size} bytes, type: ${blob.type}`);
          
          const buffer = Buffer.from(await blob.arrayBuffer());
          console.log(`📎 Buffer size: ${buffer.length} bytes`);
          
          const base64Content = buffer.toString('base64');
          console.log(`📎 Base64 length: ${base64Content.length} chars`);
          
          processedAttachments.push({
            filename: attachment.filename,
            content: base64Content,
            contentType: attachment.contentType,
          });
          
          console.log(`✅ Processed attachment: ${attachment.filename} (${attachment.contentType})`);
        } catch (error: any) {
          console.error(`❌ Failed to process attachment: ${attachment.filename}`, error.message);
        }
      }
    }

    // 5. Send email via provider
    let sentMessage;
    let providerMessageId;
    
    console.log('🔍 Account details:', {
      provider: account.emailProvider,
      hasNylasGrantId: !!account.nylasGrantId,
      hasAccessToken: !!account.accessToken,
      nylasGrantId: account.nylasGrantId?.substring(0, 10) + '...',
    });
    
    // Google and Microsoft accounts use Nylas SDK
    if ((account.emailProvider === 'nylas' || account.emailProvider === 'google' || account.emailProvider === 'microsoft') && account.nylasGrantId) {
      sentMessage = await sendNylasEmail(account.nylasGrantId, {
        to: parsedTo,
        cc: parsedCc,
        bcc: parsedBcc,
        subject: subject || '(No Subject)',
        body: emailBody || '',
        attachments: processedAttachments,
      });
      providerMessageId = sentMessage.data?.id;
    } else if (account.emailProvider === 'aurinko' && account.accessToken) {
      sentMessage = await sendAurinkoEmail(account.id, account.accessToken, {
        to: parsedTo,
        cc: parsedCc,
        bcc: parsedBcc,
        subject: subject || '(No Subject)',
        body: emailBody || '',
        attachments: processedAttachments,
      });
      providerMessageId = sentMessage.id;
    } else {
      console.error('❌ Provider not configured:', {
        provider: account.emailProvider,
        hasNylasGrantId: !!account.nylasGrantId,
        hasAccessToken: !!account.accessToken,
      });
      return NextResponse.json(
        { error: 'Email provider not configured' }, 
        { status: 400 }
      );
    }

    console.log('✅ Email sent via provider:', providerMessageId);

    // 6. Save to database in Sent folder
    const now = new Date();
    
    // Get reply-to info if this is a reply
    let inReplyTo = null;
    let emailReferences = null;
    let threadId = null;
    
    if (replyToEmailId) {
      const originalEmail = await db.query.emails.findFirst({
        where: eq(emails.id, replyToEmailId),
      });
      
      if (originalEmail) {
        inReplyTo = originalEmail.messageId || null;
        threadId = originalEmail.threadId || null;
        // Build references chain
        emailReferences = originalEmail.emailReferences 
          ? `${originalEmail.emailReferences} ${originalEmail.messageId}`
          : originalEmail.messageId;
      }
    }

    // Insert into emails table with folder = 'sent'
    const [savedEmail] = await db.insert(emails).values({
      accountId: account.id,
      provider: account.emailProvider,
      providerMessageId: providerMessageId || `local-${Date.now()}`,
      messageId: providerMessageId,
      threadId: threadId,
      providerThreadId: threadId,
      inReplyTo: inReplyTo,
      emailReferences: emailReferences,
      folder: 'sent', // ✅ This puts it in Sent folder
      folders: ['sent'],
      fromEmail: account.emailAddress,
      fromName: account.emailAddress, // Could be enhanced with user's name
      toEmails: parsedTo,
      ccEmails: parsedCc,
      bccEmails: parsedBcc,
      subject: subject || '(No Subject)',
      bodyText: emailBody,
      bodyHtml: emailBody, // Could convert to HTML
      snippet: emailBody?.substring(0, 200) || '',
      isRead: true, // Sent emails are always "read"
      hasAttachments: (attachments?.length || 0) > 0,
      attachmentsCount: attachments?.length || 0,
      attachments: attachments || [],
      sentAt: now, // ✅ Sent date
      receivedAt: now, // Same as sent for sent emails
      providerData: sentMessage as any,
    }).returning();

    console.log('✅ Email saved to database in Sent folder:', savedEmail.id);

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: savedEmail.id,
      providerMessageId,
    });

  } catch (error: any) {
    console.error('❌ Send email error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

