/**
 * POST /api/jmap/oauth/authorize
 * Initiate OAuth flow for Fastmail JMAP
 *
 * TODO: Implement OAuth 2.0 Authorization Code flow
 *
 * Steps to implement:
 * 1. Register app with Fastmail (contact Fastmail support)
 * 2. Get client_id and client_secret
 * 3. Implement authorization redirect
 * 4. Handle callback with authorization code
 * 5. Exchange code for access token
 *
 * Required OAuth scopes:
 * - urn:ietf:params:jmap:core (mandatory)
 * - urn:ietf:params:jmap:mail (read/manage mail)
 * - urn:ietf:params:jmap:submission (send mail)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'OAuth not yet implemented',
      message: 'OAuth support is coming soon! For now, please use API tokens.',
      instructions: 'Generate an API token at: Fastmail Settings → Privacy & Security → Integrations'
    },
    { status: 501 } // Not Implemented
  );
}
