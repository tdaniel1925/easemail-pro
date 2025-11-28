/**
 * POST /api/jmap/connect
 * Connect a Fastmail account using JMAP (much faster than IMAP!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { createFastmailJMAPClient } from '@/lib/jmap/client';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log(`🔐 Connecting Fastmail account via JMAP: ${email}`);

    // Create JMAP client
    const jmapClient = createFastmailJMAPClient(email, password);

    // Test connection
    console.log('🔄 Testing JMAP connection...');
    const session = await jmapClient.connect();

    console.log('✅ JMAP connection successful!');

    // Encrypt password (in production, use proper encryption)
    const encryptedPassword = Buffer.from(password).toString('base64');

    // Create account in database
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
    console.error('❌ JMAP connection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect Fastmail account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
