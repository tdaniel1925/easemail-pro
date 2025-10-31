import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeNylasCode, createNylasWebhook } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
    const supabase = createClient();
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
    
    console.log('✅ Grant received:', { grantId, email, provider });
    
    // Create account in database
    console.log('💾 Creating account in database...');
    const [account] = await db.insert(emailAccounts).values({
      userId: userId,
      provider: 'nylas',
      providerAccountId: grantId,
      emailAddress: email,
      emailProvider: provider,
      nylasGrantId: grantId,
      nylasEmail: email,
      nylasProvider: provider,
      syncStatus: 'initializing',
      isActive: true,
      autoSync: true,
    }).returning();
    
    console.log('✅ Account created:', account.id);
    
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
    
    // Sync folders and initial emails in PARALLEL for speed
    console.log('🚀 Starting parallel folder and email sync...');
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
    
    if (folderResult.status === 'fulfilled') {
      console.log('✅ Folders synced');
    } else {
      console.error('⚠️ Folder sync error:', folderResult.reason);
    }
    
    if (emailResult.status === 'fulfilled') {
      console.log('✅ Initial emails synced');
    } else {
      console.error('⚠️ Email sync error:', emailResult.reason);
    }
    
    // Trigger background sync for remaining emails (async - don't wait)
    console.log('🔄 Triggering background sync for remaining emails...');
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account.id }),
    }).catch(err => console.error('⚠️ Background sync trigger error:', err));
    
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
    
    return NextResponse.redirect(new URL('/inbox?error=connection_failed', request.url));
  }
}

