/**
 * 2FA Setup API
 * Generate TOTP secret and QR code for authenticator apps
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSecret } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const APP_NAME = 'EaseMail';

/**
 * POST - Generate 2FA setup (secret + QR code)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if 2FA is already enabled
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('two_factor_enabled')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[2FA] Error fetching user:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch user data'
      }, { status: 500 });
    }

    if (userData?.two_factor_enabled) {
      return NextResponse.json({
        error: '2FA is already enabled. Disable it first to re-setup.'
      }, { status: 400 });
    }

    // Generate a new TOTP secret (32 character base32 string)
    const secret = generateSecret();

    // Generate the otpauth URL for QR code
    const otpauth = `otpauth://totp/${APP_NAME}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(APP_NAME)}`;

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(otpauth);

    // Generate 10 recovery codes
    const recoveryCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash recovery codes before storing
    const hashedRecoveryCodes = recoveryCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Store the secret and recovery codes temporarily (not enabled yet)
    // Note: In production, you might want to encrypt the secret
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_secret: secret,
        recovery_codes: hashedRecoveryCodes,
        // Don't enable yet - user must verify first
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[2FA] Error storing secret:', updateError);
      return NextResponse.json({
        error: 'Failed to store 2FA secret'
      }, { status: 500 });
    }

    console.log('[2FA] Setup initiated for user:', user.email);

    return NextResponse.json({
      success: true,
      secret, // Show to user for manual entry
      qrCode: qrCodeDataURL,
      recoveryCodes, // Show to user to save (plain text, only time they see them)
    });
  } catch (error) {
    console.error('[2FA Setup] Error:', error);
    return NextResponse.json({
      error: 'Failed to generate 2FA setup',
    }, { status: 500 });
  }
}
