import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/usage/direct
 * Direct SQL query (no Drizzle) - for debugging/comparison
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized direct usage pricing access');
      return unauthorized();
    }

    // Check if user is platform_admin using direct SQL
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access direct usage pricing', {
        userId: user.id,
        email: user.email,
        role: userData?.role
      });
      return forbidden('Platform admin access required');
    }

    // Fetch usage pricing using direct SQL
    const { data: usage, error } = await supabase
      .from('usage_pricing')
      .select('*')
      .order('service_type');

    if (error) throw error;

    logger.admin.info('Direct usage pricing fetched', {
      requestedBy: userData.email,
      usageCount: usage?.length || 0
    });

    return successResponse({ usage: usage || [] });
  } catch (error: any) {
    logger.api.error('Error fetching usage pricing (direct)', error);
    return internalError();
  }
}

/**
 * PUT /api/admin/pricing/usage/direct
 * Update usage pricing via direct SQL (CSRF Protected)
 */
export const PUT = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized direct usage pricing update attempt');
      return unauthorized();
    }

    // Check if user is platform_admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update direct usage pricing', {
        userId: user.id,
        email: user.email,
        role: userData?.role
      });
      return forbidden('Platform admin access required');
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

    logger.admin.info('Direct usage pricing updated', {
      usageId: id,
      updatedBy: userData.email
    });

    return successResponse({ usage: data }, 'Usage pricing updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating usage pricing (direct)', error);
    return internalError();
  }
});

