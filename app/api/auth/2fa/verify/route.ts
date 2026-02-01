/**
 * 2FA Verify API
 * Verify TOTP code and enable 2FA
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verify } from 'otplib';

export const dynamic = 'force-dynamic';

/**
 * POST - Verify TOTP code and enable 2FA
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({
        error: 'Invalid code format. Must be 6 digits.'
      }, { status: 400 });
    }

    // Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's 2FA secret
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('two_factor_secret, two_factor_enabled')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      console.error('[2FA] Error fetching user:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch user data'
      }, { status: 500 });
    }

    if (userData.two_factor_enabled) {
      return NextResponse.json({
        error: '2FA is already enabled'
      }, { status: 400 });
    }

    if (!userData.two_factor_secret) {
      return NextResponse.json({
        error: 'No 2FA setup found. Please start setup first.'
      }, { status: 400 });
    }

    // Verify the TOTP code
    const isValid = verify({ token: code, secret: userData.two_factor_secret });

    if (!isValid) {
      console.log('[2FA] Invalid code attempt for user:', user.email);
      return NextResponse.json({
        error: 'Invalid code. Please try again.'
      }, { status: 400 });
    }

    // Code is valid - enable 2FA
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_enabled_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[2FA] Error enabling 2FA:', updateError);
      return NextResponse.json({
        error: 'Failed to enable 2FA'
      }, { status: 500 });
    }

    console.log('[2FA] Enabled successfully for user:', user.email);

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled successfully',
    });
  } catch (error) {
    console.error('[2FA Verify] Error:', error);
    return NextResponse.json({
      error: 'Failed to verify code',
    }, { status: 500 });
  }
}
