/**
 * MS Graph OAuth - Start Authentication
 *
 * GET /api/ms-graph/auth
 * Redirects user to Microsoft login page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/ms-graph/client';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in cookie for validation on callback
    const response = NextResponse.redirect(getAuthUrl(state));

    // Use 'none' sameSite for cross-site OAuth redirects (requires secure in production)
    // In development, we use 'lax' since localhost isn't secure
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set('ms_graph_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Also store user ID for callback
    response.cookies.set('ms_graph_user_id', user.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[MS Graph Auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
