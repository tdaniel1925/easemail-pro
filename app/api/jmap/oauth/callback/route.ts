/**
 * GET /api/jmap/oauth/callback
 * Handle OAuth callback from Fastmail
 *
 * TODO: Implement OAuth callback handler
 *
 * This route receives the authorization code from Fastmail and:
 * 1. Extracts the authorization code from query params
 * 2. Exchanges code for access token
 * 3. Stores encrypted token in database
 * 4. Creates JMAP account
 * 5. Redirects to success page
 *
 * Error handling:
 * - Handle OAuth errors (access_denied, invalid_request, etc.)
 * - Validate state parameter (CSRF protection)
 * - Handle token exchange failures
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'OAuth callback not yet implemented',
      message: 'OAuth support is coming soon!'
    },
    { status: 501 } // Not Implemented
  );
}
