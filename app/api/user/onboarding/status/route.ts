import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        onboardingCompleted: true,
        onboardingStep: true,
        onboardingSkipped: true,
        onboardingStartedAt: true,
        onboardingCompletedAt: true,
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      onboardingCompleted: dbUser.onboardingCompleted || false,
      onboardingStep: dbUser.onboardingStep || 0,
      onboardingSkipped: dbUser.onboardingSkipped || false,
      onboardingStartedAt: dbUser.onboardingStartedAt,
      onboardingCompletedAt: dbUser.onboardingCompletedAt,
    });
  } catch (error: any) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch onboarding status',
      details: error.message 
    }, { status: 500 });
  }
}

