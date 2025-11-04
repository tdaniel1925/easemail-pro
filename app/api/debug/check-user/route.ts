import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Check if user exists in Supabase Auth and show their status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json({ 
        exists: false,
        message: 'User not found in Supabase Auth'
      });
    }

    return NextResponse.json({
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata,
      },
      message: 'User exists in Supabase Auth'
    });

  } catch (error: any) {
    console.error('Error checking user:', error);
    return NextResponse.json({ 
      error: 'Failed to check user',
      details: error.message 
    }, { status: 500 });
  }
}

