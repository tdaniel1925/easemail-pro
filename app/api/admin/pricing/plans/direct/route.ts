import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/plans/direct
 * Direct SQL query (no Drizzle) - for debugging/comparison
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized direct pricing plans access');
      return unauthorized();
    }

    // Check if user is platform_admin using direct SQL
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access direct pricing plans', {
        userId: user.id,
        email: user.email,
        role: userData?.role
      });
      return forbidden('Platform admin access required');
    }

    // Fetch pricing plans using direct SQL
    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('name');

    if (error) throw error;

    logger.admin.info('Direct pricing plans fetched', {
      requestedBy: userData.email,
      planCount: plans?.length || 0
    });

    return successResponse({ plans: plans || [] });
  } catch (error: any) {
    logger.api.error('Error fetching pricing plans (direct)', error);
    return internalError();
  }
}

/**
 * PUT /api/admin/pricing/plans/direct
 * Update plan via direct SQL (CSRF Protected)
 */
export const PUT = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized direct pricing plan update attempt');
      return unauthorized();
    }

    // Check if user is platform_admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update direct pricing plan', {
        userId: user.id,
        email: user.email,
        role: userData?.role
      });
      return forbidden('Platform admin access required');
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

    logger.admin.info('Direct pricing plan updated', {
      planId: id,
      updatedBy: userData.email
    });

    return successResponse({ plan: data }, 'Pricing plan updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating plan (direct)', error);
    return internalError();
  }
});

