import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Activate Webhooks for Account
 * POST /api/nylas/accounts/[accountId]/webhooks/activate
 *
 * Creates a Nylas webhook destination for the account to receive real-time notifications
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.accountId;

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.userId, dbUser.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not connected to Nylas' }, { status: 400 });
    }

    // Get webhook URL (your domain)
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas-v3/webhooks`
      : `${req.headers.get('origin')}/api/nylas-v3/webhooks`;

    console.log(`📡 Activating webhooks for account: ${account.emailAddress}`);
    console.log(`   Webhook URL: ${webhookUrl}`);

    // Check if using localhost (Nylas doesn't allow localhost webhooks)
    if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      return NextResponse.json({
        error: 'Webhooks cannot be activated with localhost URLs',
        message: 'Nylas requires a publicly accessible URL for webhooks. Please use ngrok, localtunnel, or deploy to a public domain.',
        suggestion: 'For development: Use ngrok (ngrok http 3001) and set NEXT_PUBLIC_APP_URL to your ngrok URL',
      }, { status: 400 });
    }

    // Create webhook destination in Nylas
    const nylasApiUrl = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';
    const response = await fetch(`${nylasApiUrl}/v3/webhooks`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
      },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        description: `EaseMail webhooks for ${account.emailAddress}`,
        trigger_types: [
          'message.created',
          'message.updated',
          'message.deleted',
          'folder.created',
          'folder.updated',
          'folder.deleted',
          'grant.expired',
          'grant.deleted',
        ],
        notification_email_addresses: [],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Nylas webhook creation failed:', data);
      return NextResponse.json({
        error: data.error?.message || 'Failed to create webhook',
        details: data,
      }, { status: response.status });
    }

    // Update account with webhook status
    await db.update(emailAccounts)
      .set({
        webhookStatus: 'active',
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(`✅ Webhooks activated for ${account.emailAddress}`);

    return NextResponse.json({
      success: true,
      message: 'Webhooks activated successfully',
      webhook: {
        id: data.data?.id,
        webhook_url: webhookUrl,
        status: 'active',
      },
    });
  } catch (error: any) {
    console.error('Webhook activation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to activate webhooks' },
      { status: 500 }
    );
  }
}
