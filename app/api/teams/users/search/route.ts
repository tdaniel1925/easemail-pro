// Teams User Search API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getValidAccessToken, encryptTokens } from '@/lib/teams/teams-auth';
import { decryptToken } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const accountId = searchParams.get('accountId');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    // Get Teams account
    const accounts = await db
      .select()
      .from(teamsAccounts)
      .where(eq(teamsAccounts.userId, user.id))
      .limit(1);

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No Teams account connected' }, { status: 404 });
    }

    const account = accountId
      ? accounts.find(a => a.id === accountId) || accounts[0]
      : accounts[0];

    // Get valid access token
    const { accessToken, refreshed, newTokens } = await getValidAccessToken(
      account.accessToken,
      account.refreshToken,
      account.tokenExpiresAt
    );

    // Update tokens if refreshed
    if (refreshed && newTokens) {
      const encrypted = encryptTokens(newTokens);
      await db
        .update(teamsAccounts)
        .set({
          accessToken: encrypted.accessToken,
          refreshToken: encrypted.refreshToken,
          tokenExpiresAt: encrypted.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(teamsAccounts.id, account.id));
    }

    // Search users via Microsoft Graph
    const searchResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${encodeURIComponent(query)}') or startswith(mail,'${encodeURIComponent(query)}') or startswith(userPrincipalName,'${encodeURIComponent(query)}')&$top=10&$select=id,displayName,mail,userPrincipalName,jobTitle,department`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      console.error('User search error:', error);

      // If filter not supported, try simple search
      if (error.error?.code === 'Request_UnsupportedQuery') {
        const fallbackResponse = await fetch(
          `https://graph.microsoft.com/v1.0/users?$search="displayName:${encodeURIComponent(query)}"&$top=10&$select=id,displayName,mail,userPrincipalName,jobTitle,department`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              ConsistencyLevel: 'eventual',
            },
          }
        );

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return NextResponse.json({ users: data.value || [] });
        }
      }

      return NextResponse.json(
        { error: error.error?.message || 'Failed to search users' },
        { status: searchResponse.status }
      );
    }

    const data = await searchResponse.json();

    return NextResponse.json({
      users: data.value?.map((u: any) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.mail || u.userPrincipalName,
        jobTitle: u.jobTitle,
        department: u.department,
      })) || []
    });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search users' },
      { status: 500 }
    );
  }
}
