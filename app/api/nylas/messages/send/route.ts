import { NextRequest, NextResponse } from 'next/server';
import { sendNylasEmail } from '@/lib/email/nylas-client';
import { sendAurinkoEmail } from '@/lib/email/aurinko-client';
import { createFastmailJMAPClient } from '@/lib/jmap/client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/utils/text-sanitizer';

export const dynamic = 'force-dynamic';

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
      attachments,
      draftId // Extract draft ID for deletion after send
    } = body;

    // Validation
    if (!accountId || !to || to.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId and to' }, 
        { status: 400 }
      );
    }

    // 3. Get email account
    console.log('[Send] Looking up account:', accountId, 'Type:', typeof accountId);

    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      console.error('[Send] Account not found:', accountId);
      return NextResponse.json({
        error: `Account not found: ${accountId}. Please select a valid email account.`
      }, { status: 404 });
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

    // ✅ NEW: Add free tier branding to every other email
    // TODO: Check actual subscription status when billing is implemented
    let finalEmailBody = emailBody;
    
    try {
      // Generate a simple alternating pattern based on user ID and date
      const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const combinedString = `${user.id}-${dateKey}`;
      
      // Simple hash to get alternating behavior
      let hash = 0;
      for (let i = 0; i < combinedString.length; i++) {
        hash = ((hash << 5) - hash) + combinedString.charCodeAt(i);
        hash = hash & hash;
      }
      
      // Every other email (50%)
      const shouldAddBranding = Math.abs(hash) % 2 === 0;

      if (shouldAddBranding) {
        const brandingText = `\n\n<p style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center;"><a href="https://easemail.app" style="color: #6b7280; font-size: 12px; text-decoration: none;">EaseMail - Email is now easy</a></p>`;
        
        // Add to HTML body
        if (finalEmailBody && finalEmailBody.includes('</body>')) {
          finalEmailBody = finalEmailBody.replace('</body>', `${brandingText}</body>`);
        } else if (finalEmailBody && finalEmailBody.includes('</html>')) {
          finalEmailBody = finalEmailBody.replace('</html>', `${brandingText}</html>`);
        } else {
          // Plain text email - wrap in basic HTML
          finalEmailBody = `${finalEmailBody}${brandingText}`;
        }
        
        console.log('✅ Added free tier branding to email');
      }
    } catch (error) {
      console.error('Error adding branding:', error);
      // Continue without branding if there's an error
    }

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
      nylasProvider: account.nylasProvider,
      hasNylasGrantId: !!account.nylasGrantId,
      hasAccessToken: !!account.accessToken,
      nylasGrantId: account.nylasGrantId?.substring(0, 10) + '...',
    });

    // ✅ FIX: Check for nylasGrantId first (supports all Nylas-connected accounts: google, microsoft, imap, etc.)
    // Any account with a nylasGrantId can send via Nylas SDK, regardless of emailProvider value
    if (account.nylasGrantId) {
      console.log('📤 Sending via Nylas SDK with grantId:', account.nylasGrantId.substring(0, 15) + '...');
      sentMessage = await sendNylasEmail(account.nylasGrantId, {
        to: parsedTo,
        cc: parsedCc,
        bcc: parsedBcc,
        subject: subject || '(No Subject)',
        body: finalEmailBody || '',
        attachments: processedAttachments,
      });
      providerMessageId = sentMessage.data?.id;
    } else if (account.provider === 'jmap' && account.imapPassword) {
      // JMAP Account (Fastmail, etc.)
      console.log('📤 Sending via JMAP for account:', account.emailAddress);

      // Decrypt API token (stored base64 encoded)
      const apiToken = Buffer.from(account.imapPassword, 'base64').toString('utf-8');

      // Create JMAP client and connect
      const jmapClient = createFastmailJMAPClient(apiToken);
      await jmapClient.connect();

      // Send the email with attachments
      const jmapResult = await jmapClient.sendEmail({
        from: { email: account.emailAddress, name: account.emailAddress },
        to: parsedTo,
        cc: parsedCc.length > 0 ? parsedCc : undefined,
        bcc: parsedBcc.length > 0 ? parsedBcc : undefined,
        subject: subject || '(No Subject)',
        body: finalEmailBody || '',
        bodyType: 'html',
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
      });

      sentMessage = jmapResult;
      providerMessageId = jmapResult.emailId;
      console.log('✅ JMAP email sent:', jmapResult);
    } else if (account.emailProvider === 'aurinko' && account.accessToken) {
      console.log('📤 Sending via Aurinko with accessToken');
      sentMessage = await sendAurinkoEmail(account.id, account.accessToken, {
        to: parsedTo,
        cc: parsedCc,
        bcc: parsedBcc,
        subject: subject || '(No Subject)',
        body: finalEmailBody || '',
        attachments: processedAttachments,
      });
      providerMessageId = sentMessage.id;
    } else {
      console.error('❌ Provider not configured:', {
        provider: account.provider,
        emailProvider: account.emailProvider,
        nylasProvider: account.nylasProvider,
        hasNylasGrantId: !!account.nylasGrantId,
        hasAccessToken: !!account.accessToken,
        hasImapPassword: !!account.imapPassword,
      });
      return NextResponse.json(
        { error: 'Email provider not configured. Please reconnect your email account in Settings.' },
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
      // Try to find email by database UUID first, then fall back to provider message ID
      let originalEmail = await db.query.emails.findFirst({
        where: eq(emails.id, replyToEmailId),
      });

      // If not found by UUID, try to find by provider message ID (for backwards compatibility)
      if (!originalEmail) {
        originalEmail = await db.query.emails.findFirst({
          where: eq(emails.providerMessageId, replyToEmailId),
        });
      }

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
    // IMPORTANT: Don't save to DB if we don't have the actual provider message ID
    // This prevents duplicates when sync pulls it back from the provider
    if (!providerMessageId) {
      console.warn('⚠️ No provider message ID returned - email sent but not saved locally');
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully (will appear after sync)',
        providerMessageId: null,
      });
    }

    // At this point, providerMessageId is guaranteed to be non-null (checked above at line 259)
    // Helper to sanitize nullable fields - returns sanitized string or undefined for null/empty
    const sanitizeNullable = (text: string | null | undefined): string | undefined => {
      if (!text) return undefined;
      return sanitizeText(text);
    };

    const [savedEmail] = await db.insert(emails).values({
      accountId: account.id,
      provider: account.emailProvider || 'unknown', // ✅ Provider field is notNull in schema
      providerMessageId: sanitizeText(providerMessageId), // ✅ Use actual ID from provider (guaranteed non-null after check above)
      messageId: sanitizeText(providerMessageId),
      threadId: sanitizeNullable(threadId),
      providerThreadId: sanitizeNullable(threadId),
      inReplyTo: sanitizeNullable(inReplyTo),
      emailReferences: sanitizeNullable(emailReferences),
      folder: 'sent', // ✅ This puts it in Sent folder
      folders: ['sent'],
      fromEmail: sanitizeText(account.emailAddress),
      fromName: sanitizeText(account.emailAddress), // Could be enhanced with user's name
      toEmails: parsedTo,
      ccEmails: parsedCc,
      bccEmails: parsedBcc,
      subject: sanitizeText(subject) || '(No Subject)',
      bodyText: sanitizeText(emailBody),
      bodyHtml: sanitizeText(emailBody), // Could convert to HTML
      snippet: sanitizeText(emailBody?.substring(0, 200)),
      isRead: true, // Sent emails are always "read"
      hasAttachments: (attachments?.length || 0) > 0,
      attachmentsCount: attachments?.length || 0,
      attachments: attachments || [],
      sentAt: now, // ✅ Sent date
      receivedAt: now, // Same as sent for sent emails
      providerData: sentMessage as any,
    })
    .onConflictDoUpdate({
      target: emails.providerMessageId,
      set: {
        // Update with send API data if webhook inserted first
        folder: 'sent',
        folders: ['sent'],
        isRead: true,
        sentAt: now,
        updatedAt: new Date(),
      },
    })
    .returning();

    console.log('✅ Email saved to database in Sent folder:', savedEmail.id);

    // 7. Delete draft if this was sent from a resumed draft
    if (draftId) {
      try {
        console.log('[Send] Deleting draft after successful send:', draftId);

        // Get draft details first (for Nylas provider draft ID)
        const { emailDrafts } = await import('@/lib/db/schema');
        const draft = await db.query.emailDrafts.findFirst({
          where: eq(emailDrafts.id, draftId),
        });

        if (draft) {
          // Delete from Nylas provider if it was synced
          if (draft.providerDraftId && account.nylasGrantId) {
            try {
              const nylas = (await import('@/lib/nylas-v3/config')).getNylasClient();

              console.log('[Send] Deleting draft from Nylas:', draft.providerDraftId);

              await nylas.drafts.destroy({
                identifier: account.nylasGrantId,
                draftId: draft.providerDraftId,
              });

              console.log('[Send] ✅ Draft deleted from Nylas');
            } catch (nylasError: any) {
              console.error('[Send] ⚠️ Failed to delete draft from Nylas:', nylasError.message);
              // Continue with local deletion even if Nylas deletion fails
            }
          }

          // Delete from local database
          await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId));
          console.log('[Send] ✅ Draft deleted from local database');
        } else {
          console.warn('[Send] Draft not found:', draftId);
        }
      } catch (deleteError: any) {
        console.error('[Send] Failed to delete draft:', deleteError.message);
        // Non-critical error - email was sent successfully, so don't fail the request
      }
    }

    // 8. Return success
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

