import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/login?verified=true';
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  if (error) {
    // Handle error from Supabase
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(error_description || error)}`
    );
  }

  if (code) {
    const supabase = createClient();
    
    try {
      // Exchange the code for a session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Error exchanging code:', exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent('Failed to verify email. Please try again.')}`
        );
      }

      // Successfully verified - redirect to login with success message
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (err) {
      console.error('Callback error:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('An error occurred during verification')}`
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}


