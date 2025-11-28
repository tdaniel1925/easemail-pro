/**
 * POST /api/jmap/connect
 * Connect a Fastmail account using JMAP (much faster than IMAP!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { createFastmailJMAPClient } from '@/lib/jmap/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[JMAP Connect] Starting connection process...');

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[JMAP Connect] No authenticated user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[JMAP Connect] User authenticated:', user.id);

    const body = await request.json();
    const { email, password } = body;

    console.log('[JMAP Connect] Request body received:', { email, hasPassword: !!password });

    if (!email || !password) {
      console.error('[JMAP Connect] Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log(`🔐 Connecting Fastmail account via JMAP: ${email}`);

    // Create JMAP client
    console.log('[JMAP Connect] Creating JMAP client...');
    const jmapClient = createFastmailJMAPClient(email, password);
    console.log('[JMAP Connect] JMAP client created successfully');

    // Test connection
    console.log('🔄 Testing JMAP connection...');
    const session = await jmapClient.connect();
    console.log('[JMAP Connect] Session received:', { accountId: session.accountId, apiUrl: session.apiUrl });

    console.log('✅ JMAP connection successful!');

    // Encrypt password (in production, use proper encryption)
    console.log('[JMAP Connect] Encrypting password...');
    const encryptedPassword = Buffer.from(password).toString('base64');
    console.log('[JMAP Connect] Password encrypted');

    // Create account in database
    console.log('[JMAP Connect] Inserting account into database...');
    const [account] = await db.insert(emailAccounts).values({
      userId: user.id,
      provider: 'jmap', // Mark as JMAP (not IMAP!)
      providerAccountId: session.accountId,
      emailAddress: email,
      emailProvider: 'fastmail',

      // JMAP credentials
      imapHost: 'api.fastmail.com', // Reuse imapHost field for JMAP API URL
      imapPort: 443, // HTTPS
      imapUsername: email,
      imapPassword: encryptedPassword,
      imapTls: true,

      // Initial state
      syncStatus: 'idle',
      initialSyncCompleted: false,
      isActive: true,
      autoSync: true,
    }).returning();

    console.log(`✅ JMAP account created: ${account.id}`);

    return NextResponse.json({
      success: true,
      message: 'Fastmail account connected via JMAP',
      account: {
        id: account.id,
        emailAddress: account.emailAddress,
        provider: 'jmap',
        emailProvider: 'fastmail',
      },
    });
  } catch (error) {
    console.error('❌ [JMAP Connect] Fatal error occurred:');
    console.error('Error type:', typeof error);
    console.error('Error instanceof Error:', error instanceof Error);
    console.error('Full error:', error);

    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: 'Failed to connect Fastmail account',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
