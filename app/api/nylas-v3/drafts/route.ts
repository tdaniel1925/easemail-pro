/**
 * Nylas v3 - Drafts
 * LOCAL-ONLY STORAGE - Drafts saved to database, synced to provider only on send
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts, emailDrafts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Fast endpoint - just database operations
export const maxDuration = 30;

/**
 * POST - Create or update a draft (LOCAL ONLY)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Draft] ===== POST Request Started (LOCAL ONLY) =====');

  try {
    const body = await request.json();
    const {
      accountId,
      draftId, // If updating existing draft
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      replyToMessageId,
      attachments,
      scheduledAt // Scheduled send time
    } = body;

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    console.log('[Draft] Looking up account:', accountId);
    console.log('[Draft] Current user ID:', user.id);

    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      console.log('[Draft] Not found by nylasGrantId, trying by database ID...');
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }

    if (!account) {
      console.error('[Draft] ❌ Account not found:', accountId);
      return NextResponse.json({
        error: 'Account not found. Please reconnect your email account.'
      }, { status: 404 });
    }

    console.log('[Draft] Found account:', {
      id: account.id,
      emailAddress: account.emailAddress,
      provider: account.emailProvider,
      userId: account.userId,
      currentUserId: user.id,
      match: account.userId === user.id
    });

    if (account.userId !== user.id) {
      console.error('[Draft] ❌ User ID mismatch! Account userId:', account.userId, 'Current user:', user.id);
      return NextResponse.json({
        error: 'Unauthorized access to account'
      }, { status: 403 });
    }

    // 3. Format recipients
    let toRecipients: Array<{ email: string; name?: string }> = [];
    let ccRecipients: Array<{ email: string; name?: string }> | undefined;
    let bccRecipients: Array<{ email: string; name?: string }> | undefined;

    // Format TO recipients
    if (to && Array.isArray(to)) {
      toRecipients = to.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (to && typeof to === 'string' && to.trim()) {
      toRecipients = to.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    // Format CC recipients
    if (cc && Array.isArray(cc) && cc.length > 0) {
      ccRecipients = cc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (cc && typeof cc === 'string' && cc.trim()) {
      ccRecipients = cc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    // Format BCC recipients
    if (bcc && Array.isArray(bcc) && bcc.length > 0) {
      bccRecipients = bcc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (bcc && typeof bcc === 'string' && bcc.trim()) {
      bccRecipients = bcc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    // 4. Save or update draft in database
    let draft;

    if (draftId) {
      // Update existing draft
      console.log('[Draft] Updating existing draft:', draftId);

      const [updatedDraft] = await db
        .update(emailDrafts)
        .set({
          toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: subject || '(No Subject)',
          bodyHtml: emailBody || '',
          attachments: attachments || [],
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailDrafts.id, draftId),
            eq(emailDrafts.userId, user.id)
          )
        )
        .returning();

      draft = updatedDraft;
    } else {
      // Create new draft
      console.log('[Draft] Creating new local draft');

      const [newDraft] = await db
        .insert(emailDrafts)
        .values({
          userId: user.id,
          accountId: account.id,
          provider: account.provider || 'nylas',
          toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: subject || '(No Subject)',
          bodyHtml: emailBody || '',
          attachments: attachments || [],
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        })
        .returning();

      draft = newDraft;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Draft] ✅ Draft saved locally in ${elapsed}ms`);
    console.log('[Draft] Draft ID:', draft.id);

    return NextResponse.json({
      success: true,
      draftId: draft.id,
      data: draft,
      method: 'local',
      timing: {
        total: elapsed,
      },
    });

  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error(`[Draft] ===== ERROR after ${totalElapsed}ms =====`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save draft',
    }, { status: 500 });
  }
}

/**
 * GET - Fetch drafts from database (LOCAL ONLY)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find account by nylasGrantId or id
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch drafts from database
    console.log('[Draft] Fetching local drafts for account:', account.id);

    const drafts = await db.query.emailDrafts.findMany({
      where: and(
        eq(emailDrafts.accountId, account.id),
        eq(emailDrafts.userId, user.id)
      ),
      orderBy: [desc(emailDrafts.updatedAt)],
    });

    console.log(`[Draft] Found ${drafts.length} local drafts`);

    return NextResponse.json({
      success: true,
      drafts: drafts,
      method: 'local',
    });

  } catch (error) {
    console.error('[Draft] Error fetching drafts:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch drafts',
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete a draft from database
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete draft
    console.log('[Draft] Deleting local draft:', draftId);

    await db
      .delete(emailDrafts)
      .where(
        and(
          eq(emailDrafts.id, draftId),
          eq(emailDrafts.userId, user.id)
        )
      );

    console.log('[Draft] ✅ Draft deleted successfully');

    return NextResponse.json({
      success: true,
      method: 'local',
    });

  } catch (error) {
    console.error('[Draft] Error deleting draft:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete draft',
    }, { status: 500 });
  }
}
