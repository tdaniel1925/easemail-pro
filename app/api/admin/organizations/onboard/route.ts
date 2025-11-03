import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/organizations/onboard
 * Comprehensive organization onboarding
 */
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
    const {
      // Company Information
      name,
      slug,
      website,
      industry,
      companySize,
      description,
      
      // Business Address
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      
      // Primary Contact
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      primaryContactTitle,
      
      // Billing Contact
      billingContactName,
      billingContactEmail,
      billingContactPhone,
      
      // Technical Contact
      techContactName,
      techContactEmail,
      techContactPhone,
      
      // Subscription Details
      planType,
      maxSeats,
      billingEmail,
      billingCycle,
      
      // Additional Information
      taxId,
      purchaseOrderNumber,
      notes,
    } = body;

    // Validation
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    if (!primaryContactName || !primaryContactEmail || !primaryContactPhone) {
      return NextResponse.json({ error: 'Primary contact information is required' }, { status: 400 });
    }

    if (!addressLine1 || !city || !state || !zipCode || !country) {
      return NextResponse.json({ error: 'Complete business address is required' }, { status: 400 });
    }

    // Check if slug is already taken
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
    }

    // Create comprehensive organization record
    const [newOrg] = await db.insert(organizations).values({
      name,
      slug,
      planType: planType || 'team',
      billingEmail: billingEmail || primaryContactEmail,
      maxSeats: maxSeats || 10,
      currentSeats: 0,
      isActive: true,
      
      // Store all additional data in metadata
      metadata: {
        // Company Information
        website,
        industry,
        companySize,
        description,
        
        // Business Address
        address: {
          line1: addressLine1,
          line2: addressLine2,
          city,
          state,
          zipCode,
          country,
        },
        
        // Contacts
        contacts: {
          primary: {
            name: primaryContactName,
            email: primaryContactEmail,
            phone: primaryContactPhone,
            title: primaryContactTitle,
          },
          billing: {
            name: billingContactName || primaryContactName,
            email: billingContactEmail || primaryContactEmail,
            phone: billingContactPhone || primaryContactPhone,
          },
          technical: {
            name: techContactName || primaryContactName,
            email: techContactEmail || primaryContactEmail,
            phone: techContactPhone || primaryContactPhone,
          },
        },
        
        // Billing Information
        billing: {
          cycle: billingCycle || 'monthly',
          taxId,
          purchaseOrderNumber,
        },
        
        // Additional
        onboardingNotes: notes,
        onboardedBy: dbUser.email,
        onboardedAt: new Date().toISOString(),
      },
    }).returning();

    console.log(`✅ Organization onboarded: ${name} by admin ${dbUser.email}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Organization created successfully',
      organization: newOrg 
    });
  } catch (error: any) {
    console.error('Organization onboarding error:', error);
    return NextResponse.json({ 
      error: 'Failed to create organization',
      details: error.message 
    }, { status: 500 });
  }
}

