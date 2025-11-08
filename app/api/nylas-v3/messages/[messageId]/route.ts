/**
 * Nylas v3 - Get Single Message
 * Fetch a single message with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const messageId = params.messageId;

    if (!accountId || !messageId) {
      return NextResponse.json(
        { error: 'Account ID and Message ID required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    if (!account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Fetch message from Nylas v3
    const nylas = getNylasClient();

    const message = await nylas.messages.find({
      identifier: account.nylasGrantId,
      messageId: messageId,
    });

    console.log('[Message] Fetched message:', messageId);

    return NextResponse.json({
      success: true,
      message: message.data,
    });
  } catch (error) {
    console.error('[Message] Error fetching message:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json(
      {
        success: false,
        error: nylasError.message,
        code: nylasError.code,
      },
      { status: nylasError.statusCode || 500 }
    );
  }
}

// PUT - Update message (mark as read, starred, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const body = await request.json();
    const { accountId, unread, starred, folders } = body;
    const messageId = params.messageId;

    if (!accountId || !messageId) {
      return NextResponse.json(
        { error: 'Account ID and Message ID required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    if (!account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Update message via Nylas v3
    const nylas = getNylasClient();

    const updateData: any = {};

    if (unread !== undefined) {
      updateData.unread = unread;
    }

    if (starred !== undefined) {
      updateData.starred = starred;
    }

    if (folders) {
      updateData.folders = folders;
    }

    const response = await nylas.messages.update({
      identifier: account.nylasGrantId,
      messageId: messageId,
      requestBody: updateData,
    });

    console.log('[Message] Updated message:', messageId);

    return NextResponse.json({
      success: true,
      message: response.data,
    });
  } catch (error) {
    console.error('[Message] Error updating message:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json(
      {
        success: false,
        error: nylasError.message,
        code: nylasError.code,
      },
      { status: nylasError.statusCode || 500 }
    );
  }
}

// DELETE - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const messageId = params.messageId;

    if (!accountId || !messageId) {
      return NextResponse.json(
        { error: 'Account ID and Message ID required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    if (!account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Delete message via Nylas v3
    const nylas = getNylasClient();

    await nylas.messages.destroy({
      identifier: account.nylasGrantId,
      messageId: messageId,
    });

    console.log('[Message] Deleted message:', messageId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[Message] Error deleting message:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json(
      {
        success: false,
        error: nylasError.message,
        code: nylasError.code,
      },
      { status: nylasError.statusCode || 500 }
    );
  }
}
