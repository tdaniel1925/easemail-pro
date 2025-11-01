import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailDrafts, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

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

    // Validate at least one recipient
    if (parsedTo.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
    }

    // Save draft
    const [draft] = await db.insert(emailDrafts).values({
      userId: user.id,
      accountId,
      provider: account.emailProvider,
      to: parsedTo,
      cc: parseRecipients(cc),
      bcc: parseRecipients(bcc),
      subject: subject || '',
      bodyText: bodyText || '',
      bodyHtml: bodyHtml || bodyText || '',
      attachments: attachments || [],
      replyToEmailId: replyToEmailId || null,
      replyType: replyType || null,
    }).returning();

    console.log('✅ Draft saved:', draft.id);

    return NextResponse.json({
      success: true,
      message: 'Draft saved',
      draftId: draft.id,
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

    // Delete draft
    await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId));

    console.log('🗑️ Draft deleted:', draftId);

    return NextResponse.json({
      success: true,
      message: 'Draft deleted',
    });
  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}

