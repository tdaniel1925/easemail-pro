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

    const { emailId, nylasAccountId, snoozeUntil } = await request.json();

    if (!emailId || !nylasAccountId || !snoozeUntil) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const accessToken = account.accessToken;

    // Mark as unread and move to a "snoozed" folder or use Nylas metadata
    // Since Nylas doesn't have native snooze, we'll use metadata to track snooze time
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${nylasAccountId}/messages/${emailId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unread: true,
          metadata: {
            snoozedUntil: new Date(snoozeUntil).toISOString(),
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to snooze email:', error);
      return NextResponse.json(
        { error: 'Failed to snooze email' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error snoozing email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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

    const { emailId, nylasAccountId } = await request.json();

    if (!emailId || !nylasAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const accessToken = account.accessToken;

    // Remove snooze metadata
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${nylasAccountId}/messages/${emailId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            snoozedUntil: null,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to un-snooze email:', error);
      return NextResponse.json(
        { error: 'Failed to un-snooze email' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error un-snoozing email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
