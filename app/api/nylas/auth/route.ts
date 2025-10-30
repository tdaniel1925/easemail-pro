import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initNylasAuth } from '@/lib/email/nylas-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get authenticated user (or use test user if auth disabled)
    const { data: { user } } = await supabase.auth.getUser();
    
    // For testing without auth, use a default test user ID
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
    
    // Get provider from query params (default: google)
    const provider = request.nextUrl.searchParams.get('provider') || 'google';
    
    // Generate OAuth URL with state containing user ID
    const authUrl = await initNylasAuth(userId, provider);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.redirect(new URL('/inbox?error=oauth_failed', request.url));
  }
}

