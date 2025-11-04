import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initNylasAuth } from '@/lib/email/nylas-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get provider from query params (default: google)
    const provider = request.nextUrl.searchParams.get('provider') || 'google';
    
    // Generate OAuth URL with state containing user ID
    const authUrl = await initNylasAuth(user.id, provider);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.redirect(new URL('/inbox?error=oauth_failed', request.url));
  }
}

