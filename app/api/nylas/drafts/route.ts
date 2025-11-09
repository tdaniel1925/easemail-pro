import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailDrafts, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { getNylasClient } from '@/lib/nylas-v3/config';

export const dynamic = 'force-dynamic';

// GET: Fetch drafts for an account
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const drafts = await db.query.emailDrafts.findMany({
      where: eq(emailDrafts.accountId, accountId),
      orderBy: (drafts, { desc }) => [desc(drafts.updatedAt)],
    });

    return NextResponse.json({ success: true, drafts });
  } catch (error) {
    console.error('Fetch drafts error:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

// POST: Save draft
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      accountId, 
      to, 
      cc, 
      bcc, 
      subject, 
      bodyText, 
      bodyHtml,
      attachments, 
      replyToEmailId,
      replyType 
    } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse recipients
    const parseRecipients = (recipients: any) => {
      if (!recipients) return [];
      if (typeof recipients === 'string') {
        return recipients.split(',').map((email: string) => ({ email: email.trim() }));
      }
      if (Array.isArray(recipients)) {
        return recipients.map((r: any) => typeof r === 'string' ? { email: r } : r);
      }
      return [];
    };

    const parsedTo = parseRecipients(to);
    const parsedCc = parseRecipients(cc);
    const parsedBcc = parseRecipients(bcc);

    // Allow drafts without recipients (user might be composing)
    // Validation removed to allow saving partial drafts

    // Sync with Nylas if account has nylasGrantId
    let nylasDraftId = null;
    if (account.nylasGrantId) {
      try {
        const nylas = getNylasClient();

        // Prepare draft data for Nylas
        const draftData: any = {
          subject: subject || '(No Subject)',
          body: bodyHtml || bodyText || '',
        };

        // Format recipients for Nylas v3
        if (parsedTo && parsedTo.length > 0) {
          draftData.to = parsedTo.map((r: any) => ({
            email: r.email,
            name: r.name || undefined,
          }));
        }

        if (parsedCc && parsedCc.length > 0) {
          draftData.cc = parsedCc.map((r: any) => ({
            email: r.email,
            name: r.name || undefined,
          }));
        }

        if (parsedBcc && parsedBcc.length > 0) {
          draftData.bcc = parsedBcc.map((r: any) => ({
            email: r.email,
            name: r.name || undefined,
          }));
        }

        // Add reply-to header if this is a reply
        if (replyToEmailId) {
          draftData.reply_to_message_id = replyToEmailId;
        }

        console.log('[Draft] Syncing draft to Nylas:', {
          grantId: account.nylasGrantId,
          subject: draftData.subject,
        });

        // Create draft via Nylas v3
        const response = await nylas.drafts.create({
          identifier: account.nylasGrantId,
          requestBody: draftData,
        });

        nylasDraftId = response.data.id;
        console.log('[Draft] ✅ Synced to Nylas:', nylasDraftId);
      } catch (nylasError: any) {
        console.error('[Draft] ⚠️ Failed to sync to Nylas:', nylasError.message);
        // Continue saving to local DB even if Nylas sync fails
      }
    }

    // Save draft to local DB
    const [draft] = await db.insert(emailDrafts).values({
      userId: user.id,
      accountId,
      provider: account.emailProvider,
      toRecipients: parsedTo,
      cc: parsedCc,
      bcc: parsedBcc,
      subject: subject || '',
      bodyText: bodyText || '',
      bodyHtml: bodyHtml || bodyText || '',
      attachments: attachments || [],
      replyToEmailId: replyToEmailId || null,
      replyType: replyType || null,
      providerDraftId: nylasDraftId, // Store Nylas draft ID for future updates
    }).returning();

    console.log('✅ Draft saved to DB:', draft.id);

    return NextResponse.json({
      success: true,
      message: nylasDraftId ? 'Draft saved and synced to email provider' : 'Draft saved locally',
      draftId: draft.id,
      providerDraftId: nylasDraftId,
      draft,
    });
  } catch (error: any) {
    console.error('Save draft error:', error);
    return NextResponse.json({ 
      error: 'Failed to save draft',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE: Delete a draft
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = request.nextUrl.searchParams.get('draftId');
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    // Verify draft belongs to user
    const draft = await db.query.emailDrafts.findFirst({
      where: eq(emailDrafts.id, draftId),
    });

    if (!draft || draft.userId !== user.id) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

    // Delete from Nylas if it was synced
    if (draft.providerDraftId) {
      try {
        const account = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.id, draft.accountId),
        });

        if (account && account.nylasGrantId) {
          const nylas = getNylasClient();

          console.log('[Draft] Deleting draft from Nylas:', draft.providerDraftId);

          await nylas.drafts.destroy({
            identifier: account.nylasGrantId,
            draftId: draft.providerDraftId,
          });

          console.log('[Draft] ✅ Deleted from Nylas');
        }
      } catch (nylasError: any) {
        console.error('[Draft] ⚠️ Failed to delete from Nylas:', nylasError.message);
        // Continue with local deletion even if Nylas deletion fails
      }
    }

    // Delete draft from local DB
    await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId));

    console.log('🗑️ Draft deleted from DB:', draftId);

    return NextResponse.json({
      success: true,
      message: 'Draft deleted',
    });
  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}

