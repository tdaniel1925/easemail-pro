import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calcom/connection
 * Get user's Cal.com connection status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: connection, error } = await supabase
      .from('calcom_connections')
      .select('id, api_key_label, is_active, last_synced_at, created_at, updated_at')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      return NextResponse.json({
        error: 'Failed to fetch Cal.com connection',
        details: error.message,
      }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
      });
    }

    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        label: connection.api_key_label,
        isActive: connection.is_active,
        lastSynced: connection.last_synced_at,
        createdAt: connection.created_at,
      },
    });

  } catch (error: any) {
    console.error('[Cal.com Connection] GET Error:', error);
    return NextResponse.json({
      error: 'Failed to check Cal.com connection',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/calcom/connection
 * Create or update Cal.com connection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, label, webhookSecret } = body;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API key is required',
      }, { status: 400 });
    }

    // Validate API key format
    if (!apiKey.startsWith('cal_live_') && !apiKey.startsWith('cal_test_')) {
      return NextResponse.json({
        error: 'Invalid API key format',
        details: 'Cal.com API keys should start with cal_live_ or cal_test_',
      }, { status: 400 });
    }

    console.log('[Cal.com Connection] Connecting for user:', session.user.id);

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('calcom_connections')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (existing) {
      // Update existing connection
      const { data: updated, error: updateError } = await supabase
        .from('calcom_connections')
        .update({
          api_key: apiKey,
          api_key_label: label || 'My Cal.com Account',
          webhook_secret: webhookSecret,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
        .select('id, api_key_label, is_active, created_at')
        .single();

      if (updateError) {
        return NextResponse.json({
          error: 'Failed to update Cal.com connection',
          details: updateError.message,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Cal.com connection updated successfully',
        connection: {
          id: updated.id,
          label: updated.api_key_label,
          isActive: updated.is_active,
          createdAt: updated.created_at,
        },
      });
    } else {
      // Create new connection
      const { data: created, error: createError } = await supabase
        .from('calcom_connections')
        .insert({
          user_id: session.user.id,
          api_key: apiKey,
          api_key_label: label || 'My Cal.com Account',
          webhook_secret: webhookSecret,
          is_active: true,
        })
        .select('id, api_key_label, is_active, created_at')
        .single();

      if (createError) {
        return NextResponse.json({
          error: 'Failed to create Cal.com connection',
          details: createError.message,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Cal.com connection created successfully',
        connection: {
          id: created.id,
          label: created.api_key_label,
          isActive: created.is_active,
          createdAt: created.created_at,
        },
      });
    }

  } catch (error: any) {
    console.error('[Cal.com Connection] POST Error:', error);
    return NextResponse.json({
      error: 'Failed to connect Cal.com',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * DELETE /api/calcom/connection
 * Disconnect Cal.com account
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete connection (CASCADE will delete bookings and webhook events)
    const { error } = await supabase
      .from('calcom_connections')
      .delete()
      .eq('user_id', session.user.id);

    if (error) {
      return NextResponse.json({
        error: 'Failed to disconnect Cal.com',
        details: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cal.com disconnected successfully',
    });

  } catch (error: any) {
    console.error('[Cal.com Connection] DELETE Error:', error);
    return NextResponse.json({
      error: 'Failed to disconnect Cal.com',
      details: error.message,
    }, { status: 500 });
  }
}
