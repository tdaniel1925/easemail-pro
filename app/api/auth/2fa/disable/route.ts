/**
 * 2FA Disable API
 * Disable two-factor authentication (requires password confirmation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * POST - Disable 2FA (requires password)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({
        error: 'Password is required to disable 2FA'
      }, { status: 400 });
    }

    // Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('two_factor_enabled, password')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      console.error('[2FA] Error fetching user:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch user data'
      }, { status: 500 });
    }

    if (!userData.two_factor_enabled) {
      return NextResponse.json({
        error: '2FA is not enabled'
      }, { status: 400 });
    }

    // Verify password
    // Note: If using Supabase Auth, password verification is handled differently
    // This assumes you have a password field in your users table
    // If not, you might need to use Supabase's auth methods
    if (userData.password) {
      const isPasswordValid = await bcrypt.compare(password, userData.password);
      if (!isPasswordValid) {
        return NextResponse.json({
          error: 'Incorrect password'
        }, { status: 401 });
      }
    }

    // Disable 2FA
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        recovery_codes: null,
        two_factor_enabled_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[2FA] Error disabling 2FA:', updateError);
      return NextResponse.json({
        error: 'Failed to disable 2FA'
      }, { status: 500 });
    }

    console.log('[2FA] Disabled for user:', user.email);

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully',
    });
  } catch (error) {
    console.error('[2FA Disable] Error:', error);
    return NextResponse.json({
      error: 'Failed to disable 2FA',
    }, { status: 500 });
  }
}
