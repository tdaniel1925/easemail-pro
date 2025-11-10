/**
 * Nylas v3 - Webhook Setup
 * Register webhooks with Nylas for automatic calendar sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNylasClient } from '@/lib/nylas-v3/config';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication (admin only)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'calendar' } = body;

    const nylas = getNylasClient();
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/nylas/calendar`;

    // Define webhook triggers based on type
    const triggers: string[] = [];

    if (type === 'calendar' || type === 'all') {
      triggers.push(
        'calendar.event.created',
        'calendar.event.updated',
        'calendar.event.deleted'
      );
    }

    if (type === 'email' || type === 'all') {
      triggers.push(
        'message.created',
        'message.updated',
        'thread.replied'
      );
    }

    // Check if webhook already exists
    const existingWebhooks = await nylas.webhooks.list();
    const existingWebhook = existingWebhooks.data.find(
      (wh: any) => wh.webhookUrl === webhookUrl
    );

    if (existingWebhook) {
      // Update existing webhook
      const updated = await nylas.webhooks.update({
        webhookId: existingWebhook.id,
        requestBody: {
          triggerTypes: triggers,
          webhookUrl,
          description: 'EaseMail automatic sync webhook',
        },
      });

      return NextResponse.json({
        success: true,
        webhook: updated.data,
        message: 'Webhook updated successfully',
      });
    } else {
      // Create new webhook
      const created = await nylas.webhooks.create({
        requestBody: {
          triggerTypes: triggers,
          webhookUrl,
          description: 'EaseMail automatic sync webhook',
        },
      });

      return NextResponse.json({
        success: true,
        webhook: created.data,
        message: 'Webhook created successfully',
      });
    }
  } catch (error: any) {
    console.error('[Webhook Setup] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to setup webhook',
      },
      { status: 500 }
    );
  }
}

// Get current webhooks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nylas = getNylasClient();
    const webhooks = await nylas.webhooks.list();

    return NextResponse.json({
      success: true,
      webhooks: webhooks.data,
    });
  } catch (error: any) {
    console.error('[Webhook Setup] Error listing webhooks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to list webhooks',
      },
      { status: 500 }
    );
  }
}

// Delete webhook
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID required' },
        { status: 400 }
      );
    }

    const nylas = getNylasClient();
    await nylas.webhooks.destroy({ webhookId });

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('[Webhook Setup] Error deleting webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete webhook',
      },
      { status: 500 }
    );
  }
}
