import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, nylasAccountId } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID required' },
        { status: 400 }
      );
    }

    // Get Nylas access token from database
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, user.id))
      .limit(1);

    if (!account?.accessToken) {
      return NextResponse.json(
        { error: 'No Nylas access token found' },
        { status: 401 }
      );
    }

    // Mark email as spam via Nylas API
    // For now, we'll just move it to spam folder
    const response = await fetch(`https://api.us.nylas.com/v3/grants/${nylasAccountId}/messages/${emailId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folders: ['spam'],
        unread: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Mark as Spam] Nylas API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to mark as spam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email marked as spam',
    });
  } catch (error) {
    console.error('[Mark as Spam] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark as spam' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const nylasAccountId = searchParams.get('accountId');

    if (!emailId || !nylasAccountId) {
      return NextResponse.json(
        { error: 'Email ID and account ID required' },
        { status: 400 }
      );
    }

    // Get Nylas access token from database
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, user.id))
      .limit(1);

    if (!account?.accessToken) {
      return NextResponse.json(
        { error: 'No Nylas access token found' },
        { status: 401 }
      );
    }

    // Move back to inbox
    const response = await fetch(`https://api.us.nylas.com/v3/grants/${nylasAccountId}/messages/${emailId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folders: ['inbox'],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Not Spam] Nylas API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to move email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email moved to inbox',
    });
  } catch (error) {
    console.error('[Not Spam] Error:', error);
    return NextResponse.json(
      { error: 'Failed to move email' },
      { status: 500 }
    );
  }
}
