import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET: Fetch all organizations
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Fetch all organizations with member counts
    const orgs = await db.query.organizations.findMany({
      with: {
        members: true,
      },
    });

    // Transform to include counts
    const orgsWithCounts = orgs.map(org => ({
      ...org,
      _count: {
        members: org.members?.length || 0,
      },
      members: undefined, // Remove the full members array from response
    }));

    return NextResponse.json({ success: true, organizations: orgsWithCounts });
  } catch (error) {
    console.error('Organizations fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

// POST: Create new organization
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, planType, billingEmail, maxSeats } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check if slug is already taken
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
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

    console.log(`✅ Organization created: ${name} by admin ${dbUser.email}`);

    return NextResponse.json({ success: true, organization: newOrg });
  } catch (error) {
    console.error('Organization create error:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}

