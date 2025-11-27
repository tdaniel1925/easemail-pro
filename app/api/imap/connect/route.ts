/**
 * POST /api/imap/connect
 * Add a new IMAP account (e.g., Fastmail with app-specific password)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { testIMAPConnection, getFastmailIMAPConfig, getIMAPFolders, connectToIMAP, closeIMAPConnection } from '@/lib/imap/connection';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, provider } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Build IMAP config based on provider
    let imapConfig;

    if (provider === 'fastmail' || email.includes('@fastmail')) {
      imapConfig = getFastmailIMAPConfig(email, password);
    } else {
      // Generic IMAP config (user must provide host/port in future iterations)
      return NextResponse.json(
        { error: 'Only Fastmail is currently supported for direct IMAP. Use Nylas for other providers.' },
        { status: 400 }
      );
    }

    console.log(`🔌 Testing IMAP connection for ${email}...`);

    // Test connection
    const testResult = await testIMAPConnection(imapConfig);

    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to connect to IMAP server',
          details: testResult.error,
        },
        { status: 400 }
      );
    }

    console.log(`✅ IMAP connection successful for ${email}`);

    // Get folder list
    const connection = await connectToIMAP(imapConfig);
    const folders = await getIMAPFolders(connection);
    closeIMAPConnection(connection);

    console.log(`📁 Found ${folders.length} folders: ${folders.join(', ')}`);

    // Encrypt password (in production, use proper encryption)
    // For now, we'll store it as-is (NOT RECOMMENDED FOR PRODUCTION)
    // TODO: Implement proper encryption using a secret key
    const encryptedPassword = password; // FIXME: Encrypt this!

    // Create account in database
    const [account] = await db.insert(emailAccounts).values({
      userId: user.id,
      provider: 'imap', // Mark as direct IMAP
      providerAccountId: email, // Use email as ID
      emailAddress: email,
      emailProvider: provider || 'fastmail',

      // IMAP credentials
      imapHost: imapConfig.host,
      imapPort: imapConfig.port,
      imapUsername: imapConfig.username,
      imapPassword: encryptedPassword,
      imapTls: imapConfig.tls ?? true,
      imapLastUid: 0,

      // Initial state
      syncStatus: 'idle',
      initialSyncCompleted: false,
      isActive: true,
      autoSync: true,
    }).returning();

    console.log(`✅ IMAP account created: ${account.id}`);

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.emailAddress,
        provider: account.provider,
        foldersFound: folders.length,
      },
      message: 'IMAP account connected successfully. Starting initial sync...',
    });

  } catch (error) {
    console.error('Error connecting IMAP account:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect IMAP account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
