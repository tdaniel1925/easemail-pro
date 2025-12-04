/**
 * MS Graph OAuth - Callback Handler
 *
 * GET /api/ms-graph/callback
 * Handles the OAuth callback from Microsoft, exchanges code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { msGraphAccounts } from '@/lib/db/schema';
import { exchangeCodeForToken, createGraphClient } from '@/lib/ms-graph/client';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for errors from Microsoft
    if (error) {
      console.error('[MS Graph Callback] Error from Microsoft:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/teams?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/teams?error=No authorization code received', request.url)
      );
    }

    // Validate state token
    const storedState = request.cookies.get('ms_graph_state')?.value;
    const userId = request.cookies.get('ms_graph_user_id')?.value;

    if (!storedState || storedState !== state) {
      console.error('[MS Graph Callback] State mismatch');
      return NextResponse.redirect(
        new URL('/teams?error=Invalid state token - please try again', request.url)
      );
    }

    if (!userId) {
      console.error('[MS Graph Callback] No user ID in cookie');
      return NextResponse.redirect(
        new URL('/teams?error=Session expired, please try again', request.url)
      );
    }

    // Exchange code for tokens
    console.log('[MS Graph Callback] Exchanging code for tokens...');
    const tokenData = await exchangeCodeForToken(code);

    // Get user info from MS Graph
    const client = createGraphClient(tokenData.accessToken);
    const msUser = await client.api('/me').get();

    console.log('[MS Graph Callback] Got user info:', {
      id: msUser.id,
      displayName: msUser.displayName,
      mail: msUser.mail || msUser.userPrincipalName,
    });

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

    // Check if account already exists
    const existingAccount = await db.query.msGraphAccounts.findFirst({
      where: and(
        eq(msGraphAccounts.userId, userId),
        eq(msGraphAccounts.msUserId, msUser.id)
      ),
    });

    if (existingAccount) {
      // Update existing account
      await db.update(msGraphAccounts)
        .set({
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt,
          scopes: tokenData.scope.split(' '),
          displayName: msUser.displayName,
          email: msUser.mail || msUser.userPrincipalName,
          userPrincipalName: msUser.userPrincipalName,
          isConnected: true,
          lastError: null,
          refreshFailures: 0,
          updatedAt: new Date(),
        })
        .where(eq(msGraphAccounts.id, existingAccount.id));

      console.log('[MS Graph Callback] Updated existing account:', existingAccount.id);
    } else {
      // Create new account
      const newAccount = await db.insert(msGraphAccounts)
        .values({
          userId,
          msUserId: msUser.id,
          email: msUser.mail || msUser.userPrincipalName,
          displayName: msUser.displayName,
          userPrincipalName: msUser.userPrincipalName,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt,
          scopes: tokenData.scope.split(' '),
          isConnected: true,
        })
        .returning({ id: msGraphAccounts.id });

      console.log('[MS Graph Callback] Created new account:', newAccount[0].id);
    }

    // Clear cookies and redirect to success
    const response = NextResponse.redirect(
      new URL('/teams?ms_teams=connected', request.url)
    );

    response.cookies.delete('ms_graph_state');
    response.cookies.delete('ms_graph_user_id');

    return response;
  } catch (error) {
    console.error('[MS Graph Callback] Error:', error);
    return NextResponse.redirect(
      new URL(
        `/teams?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'Failed to connect MS Teams'
        )}`,
        request.url
      )
    );
  }
}
