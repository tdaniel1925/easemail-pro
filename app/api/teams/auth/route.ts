// Teams OAuth Initiation Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTeamsAuthUrl, createOAuthState, validateTeamsConfig } from '@/lib/teams/teams-auth';

export async function GET(request: Request) {
  try {
    // Validate Teams config
    const config = validateTeamsConfig();
    if (!config.valid) {
      return NextResponse.json(
        { error: `Missing Teams configuration: ${config.missing.join(', ')}` },
        { status: 500 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get optional return URL from query params
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('returnUrl') || '/teams';

    // Create state parameter with user ID and return URL
    const state = createOAuthState(user.id, returnUrl);

    // Generate auth URL
    const authUrl = getTeamsAuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Teams auth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate Teams auth' },
      { status: 500 }
    );
  }
}
