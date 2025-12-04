/**
 * MS Graph Presence API
 *
 * GET /api/ms-graph/presence - Get current user's presence
 * GET /api/ms-graph/presence?userIds=id1,id2 - Get presence for multiple users
 * PUT /api/ms-graph/presence - Set user's presence
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { msGraphAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { MSGraphTeamsClient, refreshAccessToken } from '@/lib/ms-graph/client';

async function getValidAccessToken(account: any): Promise<string> {
  const tokenExpiresAt = new Date(account.tokenExpiresAt);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (tokenExpiresAt > fiveMinutesFromNow) {
    return account.accessToken;
  }

  console.log('[MS Graph Presence] Refreshing access token...');
  const newTokens = await refreshAccessToken(account.refreshToken);

  await db.update(msGraphAccounts)
    .set({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
      refreshFailures: 0,
      updatedAt: new Date(),
    })
    .where(eq(msGraphAccounts.id, account.id));

  return newTokens.accessToken;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const msAccount = await db.query.msGraphAccounts.findFirst({
      where: eq(msGraphAccounts.userId, user.id),
    });

    if (!msAccount) {
      return NextResponse.json(
        { error: 'MS Teams not connected' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userIds = searchParams.get('userIds');

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    if (userIds) {
      // Get presence for multiple users
      const ids = userIds.split(',');
      console.log('[MS Graph Presence] Getting presence for users:', ids.length);
      const presences = await teamsClient.getPresenceForUsers(ids);

      return NextResponse.json({
        success: true,
        presences: presences.map(p => ({
          userId: p.id,
          availability: p.availability,
          activity: p.activity,
        })),
      });
    } else {
      // Get current user's presence
      console.log('[MS Graph Presence] Getting my presence...');
      const presence = await teamsClient.getMyPresence();

      return NextResponse.json({
        success: true,
        presence: {
          availability: presence.availability,
          activity: presence.activity,
        },
      });
    }
  } catch (error) {
    console.error('[MS Graph Presence] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get presence' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const msAccount = await db.query.msGraphAccounts.findFirst({
      where: eq(msGraphAccounts.userId, user.id),
    });

    if (!msAccount) {
      return NextResponse.json(
        { error: 'MS Teams not connected' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { availability, activity, expirationDuration } = body;

    if (!availability || !activity) {
      return NextResponse.json(
        { error: 'availability and activity are required' },
        { status: 400 }
      );
    }

    // Validate availability values
    const validAvailabilities = ['Available', 'Busy', 'DoNotDisturb', 'BeRightBack', 'Away', 'Offline'];
    if (!validAvailabilities.includes(availability)) {
      return NextResponse.json(
        { error: `Invalid availability. Must be one of: ${validAvailabilities.join(', ')}` },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    console.log('[MS Graph Presence] Setting presence:', { availability, activity });
    await teamsClient.setPresence(availability, activity, expirationDuration);

    return NextResponse.json({
      success: true,
      message: 'Presence updated successfully',
    });
  } catch (error) {
    console.error('[MS Graph Presence] Set error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set presence' },
      { status: 500 }
    );
  }
}
