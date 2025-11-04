import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update onboarding started timestamp
    await db.update(users)
      .set({
        onboardingStartedAt: new Date(),
        onboardingStep: 0,
        onboardingSkipped: false,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error starting onboarding:', error);
    return NextResponse.json({ 
      error: 'Failed to start onboarding',
      details: error.message 
    }, { status: 500 });
  }
}

