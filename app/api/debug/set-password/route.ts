import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Simple endpoint to set a known password for testing
export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    if (!userId || !password) {
      return NextResponse.json({ error: 'userId and password required' }, { status: 400 });
    }

    // Must be at least 6 characters
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true,
      ban_duration: 'none',
    });

    if (error) {
      console.error('Password update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Password updated for user ${userId}`,
      password: password, // Return it so you can see what was set
    });
  } catch (error: any) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

