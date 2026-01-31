import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNylasWebhook } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * HIGH PRIORITY FIX: Retry webhook setup for accounts where it failed or timed out
 *
 * This endpoint allows users to retry webhook setup from the UI if it failed during
 * the initial OAuth callback (due to timeout or network issues).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.log('🔄 Retrying webhook setup for account:', accountId);

    // Attempt webhook creation
    try {
      const webhook = await createNylasWebhook(accountId);
      const webhookId = webhook.data?.id || (webhook as any).id;

      // Update account with webhook info
      await db.update(emailAccounts)
        .set({
          webhookId: webhookId,
          webhookStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, accountId));

      console.log('✅ Webhook setup successful:', webhookId);

      return NextResponse.json({
        success: true,
        message: 'Webhook setup successful. Real-time sync is now active.',
        webhookId,
      });
    } catch (webhookError) {
      console.error('❌ Webhook setup failed:', webhookError);

      // Mark as failed
      await db.update(emailAccounts)
        .set({
          webhookStatus: 'failed',
          lastError: webhookError instanceof Error ? webhookError.message : 'Webhook setup failed',
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, accountId));

      return NextResponse.json({
        success: false,
        error: 'Failed to set up webhook. Your emails will still sync, but may not update in real-time. You can try again later.',
        details: webhookError instanceof Error ? webhookError.message : 'Unknown error',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Webhook retry error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retry webhook setup',
    }, { status: 500 });
  }
}
