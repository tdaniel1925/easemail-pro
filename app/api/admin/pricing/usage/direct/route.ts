import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/pricing/usage/direct - Direct SQL query (no Drizzle)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform_admin using direct SQL
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden: Platform admin access required' }, { status: 403 });
    }

    // Fetch usage pricing using direct SQL
    const { data: usage, error } = await supabase
      .from('usage_pricing')
      .select('*')
      .order('service_type');

    if (error) throw error;

    return NextResponse.json({ success: true, usage: usage || [] });
  } catch (error: any) {
    console.error('Error fetching usage pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage pricing' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pricing/usage/direct - Update usage pricing
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform_admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, base_rate, unit, description } = body;

    // Update using direct SQL
    const { data, error } = await supabase
      .from('usage_pricing')
      .update({
        base_rate,
        unit,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, usage: data });
  } catch (error: any) {
    console.error('Error updating usage pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update usage pricing' },
      { status: 500 }
    );
  }
}

