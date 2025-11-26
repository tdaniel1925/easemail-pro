import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, nylasAccountId, snoozeUntil } = await request.json();

    if (!emailId || !nylasAccountId || !snoozeUntil) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Nylas access token from session
    const accessToken = session.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Nylas access token found' },
        { status: 401 }
      );
    }

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, nylasAccountId } = await request.json();

    if (!emailId || !nylasAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Nylas access token from session
    const accessToken = session.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Nylas access token found' },
        { status: 401 }
      );
    }

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
