import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeNylasCode, createNylasWebhook } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Convert technical error messages to user-friendly messages
 */
function getUserFriendlyError(error: any, provider?: string): string {
  const errorMessage = error?.message?.toLowerCase() || String(error).toLowerCase();

  // IMAP-specific errors
  if (provider === 'imap') {
    if (errorMessage.includes('authentication') || errorMessage.includes('auth failed') || errorMessage.includes('invalid credentials')) {
      return 'IMAP authentication failed. Please verify your email address and password are correct.';
    }
    if (errorMessage.includes('connection') || errorMessage.includes('connect') || errorMessage.includes('timeout')) {
      return 'Unable to connect to your IMAP server. Please check your server address and port settings.';
    }
    if (errorMessage.includes('ssl') || errorMessage.includes('tls') || errorMessage.includes('certificate')) {
      return 'SSL/TLS connection error. Please verify your security settings (SSL/TLS) are correct.';
    }
    if (errorMessage.includes('port')) {
      return 'Invalid IMAP port. Common ports are 993 (SSL) or 143 (STARTTLS).';
    }
  }

  // Google-specific errors
  if (provider === 'google') {
    if (errorMessage.includes('access_denied') || errorMessage.includes('consent')) {
      return 'Gmail access was denied. Please grant all required permissions to sync your emails.';
    }
    if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
      return 'Insufficient Gmail permissions. Please re-authorize with all required scopes.';
    }
  }

  // Microsoft-specific errors
  if (provider === 'microsoft') {
    if (errorMessage.includes('access_denied') || errorMessage.includes('consent')) {
      return 'Outlook access was denied. Please grant all required permissions to sync your emails.';
    }
    if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
      return 'Insufficient Outlook permissions. Please re-authorize with all required scopes.';
    }
  }

  // Generic Nylas errors
  if (errorMessage.includes('grant') || errorMessage.includes('authorization')) {
    return 'Authorization failed. Please try reconnecting your email account.';
  }
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'Too many connection attempts. Please wait a few minutes and try again.';
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  // Default fallback
  return 'Failed to connect your email account. Please try again or contact support if the issue persists.';
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');
  
  console.log('🔵 Nylas callback received:', { code: code?.slice(0, 20), state, error });
  
  if (error) {
    console.error('❌ OAuth error:', error);
    return NextResponse.redirect(new URL(`/inbox?error=${error}`, request.url));
  }
  
  if (!code || !state) {
    console.error('❌ Missing code or state');
    return NextResponse.redirect(new URL('/inbox?error=invalid_request', request.url));
  }
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // For testing without auth, use the state as user ID or default test user
    const userId = user?.id || state;
    console.log('👤 Using userId:', userId);
    
    // Exchange code for grant
    console.log('🔄 Exchanging code for grant...');
    const grantResponse = await exchangeNylasCode(code);
    const grantId = grantResponse.grantId;
    const email = grantResponse.email;
    const provider = grantResponse.provider;
    const scopes = grantResponse.scopes;

    console.log('✅ Grant received:', { grantId, email, provider, scopes });
    
    // Check if account already exists (reconnection scenario)
    console.log('🔍 Checking for existing account...');
    const existingAccount = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.emailAddress, email),
    });
    
    let account;
    
    if (existingAccount) {
      // UPDATE existing account with new grant (preserves syncCursor and existing data!)
      console.log('🔄 Updating existing account:', existingAccount.id);
      [account] = await db.update(emailAccounts)
        .set({
          nylasGrantId: grantId,
          providerAccountId: grantId,
          nylasScopes: scopes,
          syncStatus: 'active',
          lastError: null, // Clear any previous errors
          isActive: true,
          autoSync: true,
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, existingAccount.id))
        .returning();
      console.log('✅ Account updated, preserved sync state');
    } else {
      // Create NEW account
      console.log('💾 Creating new account in database...');
      [account] = await db.insert(emailAccounts).values({
        userId: userId,
        provider: 'nylas',
        providerAccountId: grantId,
        emailAddress: email,
        emailProvider: provider,
        nylasGrantId: grantId,
        nylasEmail: email,
        nylasProvider: provider,
        nylasScopes: scopes,
        syncStatus: 'initializing',
        isActive: true,
        autoSync: true,
      }).returning();
      console.log('✅ New account created:', account.id);
    }
    
    // Setup webhook for this account
    try {
      console.log('🪝 Setting up webhook...');
      const webhook = await createNylasWebhook(account.id);
      // Nylas v3 returns webhook in the data property
      const webhookId = webhook.data?.id || (webhook as any).id;
      await db.update(emailAccounts)
        .set({
          webhookId: webhookId,
          webhookStatus: 'active',
        })
        .where(eq(emailAccounts.id, account.id));
      console.log('✅ Webhook created:', webhookId);
    } catch (webhookError) {
      console.error('⚠️ Webhook creation error:', webhookError);
      // Continue anyway - webhooks can be setup later
    }
    
    // Sync folders and initial emails ONLY for NEW accounts
    if (!existingAccount) {
      console.log('🚀 New account - starting parallel folder and email sync...');
      const [folderResult, emailResult] = await Promise.allSettled([
        // Sync folders (async)
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/folders/sync?accountId=${account.id}`, {
          method: 'POST',
        }),
        // Sync initial emails (200)
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id, limit: 200, fullSync: true }),
        }),
      ]);
      
      let syncErrors = [];
      
      if (folderResult.status === 'fulfilled') {
        console.log('✅ Folders synced');
      } else {
        console.error('⚠️ Folder sync error:', folderResult.reason);
        syncErrors.push('folders');
      }
      
      if (emailResult.status === 'fulfilled') {
        console.log('✅ Initial emails synced');
      } else {
        console.error('⚠️ Email sync error:', emailResult.reason);
        syncErrors.push('emails');
      }
      
      // Trigger background sync for remaining emails (async - don't wait)
      console.log('🔄 Triggering background sync for remaining emails...');
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      }).catch(err => console.error('⚠️ Background sync trigger error:', err));
      
      // Redirect with sync status info
      if (syncErrors.length > 0) {
        console.log('⚠️ Some sync operations failed:', syncErrors);
        return NextResponse.redirect(new URL(`/inbox?success=account_added&syncing=true&warnings=${syncErrors.join(',')}`, request.url));
      }
    } else {
      console.log('✅ Reconnected - skipping initial sync, cursor preserved');
      console.log('📊 Existing sync state:', {
        cursor: existingAccount.syncCursor?.substring(0, 20) + '...',
        syncedCount: existingAccount.syncedEmailCount,
        initialComplete: existingAccount.initialSyncCompleted,
      });
    }
    
    console.log('🎉 Redirecting to inbox with success message');
    return NextResponse.redirect(new URL('/inbox?success=account_added&syncing=true', request.url));
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // If it's a Nylas error, log more details
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Error message:', (error as any).message);
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      console.error('Status code:', (error as any).statusCode);
    }
    if (error && typeof error === 'object' && 'body' in error) {
      console.error('Response body:', (error as any).body);
    }

    // Get user-friendly error message
    const userFriendlyError = getUserFriendlyError(error);
    const encodedError = encodeURIComponent(userFriendlyError);

    return NextResponse.redirect(new URL(`/inbox?error=${encodedError}`, request.url));
  }
}

