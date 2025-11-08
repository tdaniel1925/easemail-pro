/**
 * Nylas v3 - Drafts
 * Create and manage drafts using Nylas v3 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, to, cc, bcc, subject, body: emailBody, replyToMessageId } = body;

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not connected to Nylas' }, { status: 400 });
    }

    // 3. Prepare draft data for Nylas v3
    const nylas = getNylasClient();

    const draftData: any = {
      subject: subject || '(No Subject)',
      body: emailBody || '',
    };

    // Format recipients for Nylas v3
    if (to && Array.isArray(to)) {
      draftData.to = to.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (to && typeof to === 'string' && to.trim()) {
      draftData.to = to.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    if (cc && Array.isArray(cc) && cc.length > 0) {
      draftData.cc = cc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (cc && typeof cc === 'string' && cc.trim()) {
      draftData.cc = cc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    if (bcc && Array.isArray(bcc) && bcc.length > 0) {
      draftData.bcc = bcc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (bcc && typeof bcc === 'string' && bcc.trim()) {
      draftData.bcc = bcc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    // Add reply-to header if this is a reply
    if (replyToMessageId) {
      draftData.reply_to_message_id = replyToMessageId;
    }

    console.log('[Draft] Creating draft via Nylas v3:', {
      grantId: account.nylasGrantId,
      subject: draftData.subject,
    });

    // 4. Create draft via Nylas v3
    const response = await nylas.drafts.create({
      identifier: account.nylasGrantId,
      requestBody: draftData,
    });

    console.log('[Draft] Draft created successfully:', response.data.id);

    return NextResponse.json({
      success: true,
      draftId: response.data.id,
      data: response.data,
    });
  } catch (error) {
    console.error('[Draft] Error creating draft:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
    }, { status: nylasError.statusCode || 500 });
  }
}

// GET - Fetch drafts for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not connected to Nylas' }, { status: 400 });
    }

    // 3. Fetch drafts from Nylas v3
    const nylas = getNylasClient();

    const response = await nylas.drafts.list({
      identifier: account.nylasGrantId,
    });

    console.log('[Draft] Fetched drafts:', response.data.length);

    return NextResponse.json({
      success: true,
      drafts: response.data,
    });
  } catch (error) {
    console.error('[Draft] Error fetching drafts:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
    }, { status: nylasError.statusCode || 500 });
  }
}
