import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/pricing/plans/direct - Direct SQL query (no Drizzle)
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

    // Fetch pricing plans using direct SQL
    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ success: true, plans: plans || [] });
  } catch (error: any) {
    console.error('Error fetching pricing plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pricing/plans/direct - Update plan
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
    const { id, display_name, base_price_monthly, base_price_annual } = body;

    // Update using direct SQL
    const { data, error } = await supabase
      .from('pricing_plans')
      .update({
        display_name,
        base_price_monthly,
        base_price_annual,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, plan: data });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plan' },
      { status: 500 }
    );
  }
}

