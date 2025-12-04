/**
 * MS Graph Teams API
 *
 * GET /api/ms-graph/teams - List user's teams
 * GET /api/ms-graph/teams?teamId=xxx - Get team channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { msGraphAccounts, msTeamsCache, msChannelsCache } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { MSGraphTeamsClient, refreshAccessToken } from '@/lib/ms-graph/client';

async function getValidAccessToken(account: any): Promise<string> {
  // Check if token is expired or about to expire (within 5 minutes)
  const tokenExpiresAt = new Date(account.tokenExpiresAt);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (tokenExpiresAt > fiveMinutesFromNow) {
    return account.accessToken;
  }

  // Refresh the token
  console.log('[MS Graph Teams] Refreshing access token...');
  const newTokens = await refreshAccessToken(account.refreshToken);

  // Update in database
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
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get MS Graph account
    const msAccount = await db.query.msGraphAccounts.findFirst({
      where: eq(msGraphAccounts.userId, user.id),
    });

    if (!msAccount) {
      return NextResponse.json(
        { error: 'MS Teams not connected. Please connect your account first.' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');

    // Get valid access token
    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    if (teamId) {
      // Get channels for a specific team
      console.log('[MS Graph Teams] Getting channels for team:', teamId);
      const channels = await teamsClient.getTeamChannels(teamId);

      // Cache channels in database
      for (const channel of channels) {
        // Find or get team cache entry
        const teamCache = await db.query.msTeamsCache.findFirst({
          where: and(
            eq(msTeamsCache.msAccountId, msAccount.id),
            eq(msTeamsCache.msTeamId, teamId)
          ),
        });

        if (teamCache) {
          await db.insert(msChannelsCache)
            .values({
              teamCacheId: teamCache.id,
              msChannelId: channel.id,
              displayName: channel.displayName,
              description: channel.description,
              webUrl: channel.webUrl,
              membershipType: channel.membershipType,
              lastSyncedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [msChannelsCache.teamCacheId, msChannelsCache.msChannelId],
              set: {
                displayName: channel.displayName,
                description: channel.description,
                webUrl: channel.webUrl,
                membershipType: channel.membershipType,
                lastSyncedAt: new Date(),
                updatedAt: new Date(),
              },
            });
        }
      }

      return NextResponse.json({
        success: true,
        channels,
      });
    } else {
      // Get all teams
      console.log('[MS Graph Teams] Getting all teams...');
      const teams = await teamsClient.getMyTeams();

      // Cache teams in database
      for (const team of teams) {
        await db.insert(msTeamsCache)
          .values({
            msAccountId: msAccount.id,
            msTeamId: team.id,
            displayName: team.displayName,
            description: team.description,
            webUrl: team.webUrl,
            isArchived: team.isArchived,
            lastSyncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [msTeamsCache.msAccountId, msTeamsCache.msTeamId],
            set: {
              displayName: team.displayName,
              description: team.description,
              webUrl: team.webUrl,
              isArchived: team.isArchived,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
      }

      // Update last synced time
      await db.update(msGraphAccounts)
        .set({ lastSyncedAt: new Date() })
        .where(eq(msGraphAccounts.id, msAccount.id));

      return NextResponse.json({
        success: true,
        teams,
      });
    }
  } catch (error) {
    console.error('[MS Graph Teams] Error:', error);

    // Handle token refresh failures
    if (error instanceof Error && error.message.includes('refresh')) {
      return NextResponse.json(
        { error: 'MS Teams session expired. Please reconnect your account.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get teams' },
      { status: 500 }
    );
  }
}
