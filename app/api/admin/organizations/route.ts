import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

// GET: Fetch all organizations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organizations list access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to list organizations', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    // Fetch all organizations
    const orgs = await db.query.organizations.findMany();

    // Add comprehensive counts for each organization
    const orgsWithCounts = await Promise.all(
      orgs.map(async (org) => {
        // Count organization members (from organization_members table)
        const memberCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, org.id));

        // Count users linked to this organization (from users table)
        const userCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.organizationId, org.id));

        const memberCount = Number(memberCountResult[0]?.count || 0);
        const userCount = Number(userCountResult[0]?.count || 0);

        // Use the higher of the two counts (in case members table isn't populated)
        const actualMemberCount = Math.max(memberCount, userCount);

        return {
          ...org,
          currentSeats: actualMemberCount, // Update current seats to reflect actual count
          _count: {
            members: actualMemberCount,
            users: userCount,
          },
        };
      })
    );

    logger.admin.info('Organizations list fetched', {
      requestedBy: dbUser.email,
      organizationCount: orgsWithCounts.length
    });

    return successResponse({ organizations: orgsWithCounts });
  } catch (error) {
    logger.api.error('Organizations fetch error', error);
    return internalError();
  }
}

// POST: Create new organization (CSRF Protected)
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to create organization', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { name, slug, planType, billingEmail, maxSeats } = body;

    if (!name || !slug) {
      logger.admin.warn('Missing required fields for organization creation', {
        hasName: !!name,
        hasSlug: !!slug,
        requestedBy: dbUser.email
      });
      return badRequest('Name and slug are required');
    }

    // Check if slug is already taken
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      logger.admin.warn('Attempted to create organization with duplicate slug', {
        slug,
        requestedBy: dbUser.email
      });
      return badRequest('Slug already in use');
    }

    // Create organization
    const [newOrg] = await db.insert(organizations).values({
      name,
      slug,
      planType: planType || 'team',
      billingEmail: billingEmail || null,
      maxSeats: maxSeats || 10,
      currentSeats: 0,
      isActive: true,
    }).returning();

    logger.admin.info('Organization created', {
      organizationId: newOrg.id,
      name: newOrg.name,
      slug: newOrg.slug,
      planType: newOrg.planType,
      createdBy: dbUser.email
    });

    return successResponse({ organization: newOrg }, 'Organization created successfully');
  } catch (error) {
    logger.api.error('Organization create error', error);
    return internalError();
  }
});

