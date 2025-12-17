// Teams OAuth Callback Route
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teamsAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  exchangeCodeForToken,
  getTeamsUserProfile,
  encryptTokens,
  parseOAuthState,
  TEAMS_SCOPES,
} from '@/lib/teams/teams-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Teams OAuth error:', error, errorDescription);
      const returnUrl = state ? parseOAuthState(state).returnUrl || '/settings/integrations' : '/settings/integrations';
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=${encodeURIComponent(errorDescription || error)}`, process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=Missing+authorization+code', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Parse state to get user ID
    const { userId, returnUrl } = parseOAuthState(state);
    const redirectUrl = returnUrl || '/settings/integrations';

    // Exchange code for tokens
    console.log('🔄 Exchanging Teams auth code for tokens...');
    const tokens = await exchangeCodeForToken(code);

    // Get user profile from Microsoft
    console.log('👤 Fetching Teams user profile...');
    const profile = await getTeamsUserProfile(tokens.access_token);

    // Encrypt tokens for storage
    const encryptedTokens = encryptTokens(tokens);

    // Check if account already exists
    const existingAccount = await db
      .select()
      .from(teamsAccounts)
      .where(
        and(
          eq(teamsAccounts.userId, userId),
          eq(teamsAccounts.microsoftUserId, profile.id)
        )
      )
      .limit(1);

    if (existingAccount.length > 0) {
      // Update existing account
      await db
        .update(teamsAccounts)
        .set({
          email: profile.mail || profile.userPrincipalName,
          displayName: profile.displayName,
          accessToken: encryptedTokens.accessToken,
          refreshToken: encryptedTokens.refreshToken,
          tokenExpiresAt: encryptedTokens.expiresAt,
          scopes: TEAMS_SCOPES,
          isActive: true,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(teamsAccounts.id, existingAccount[0].id));

      console.log(`✅ Updated existing Teams account: ${profile.mail}`);
    } else {
      // Create new account
      await db.insert(teamsAccounts).values({
        userId,
        microsoftUserId: profile.id,
        email: profile.mail || profile.userPrincipalName,
        displayName: profile.displayName,
        tenantId: null, // Could extract from token if needed
        accessToken: encryptedTokens.accessToken,
        refreshToken: encryptedTokens.refreshToken,
        tokenExpiresAt: encryptedTokens.expiresAt,
        scopes: TEAMS_SCOPES,
        syncStatus: 'idle',
        isActive: true,
        autoSync: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Created new Teams account: ${profile.mail}`);
    }

    // Redirect back to app with success
    return NextResponse.redirect(
      new URL(`${redirectUrl}?teams=connected`, process.env.NEXT_PUBLIC_APP_URL!)
    );
  } catch (error) {
    console.error('Teams callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'Failed to connect Teams'
        )}`,
        process.env.NEXT_PUBLIC_APP_URL!
      )
    );
  }
}
