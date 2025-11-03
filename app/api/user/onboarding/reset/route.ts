import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset onboarding state
    await db.update(users)
      .set({
        onboardingCompleted: false,
        onboardingSkipped: false,
        onboardingStep: 0,
        onboardingStartedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log(`🔄 User ${user.email} restarted onboarding`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting onboarding:', error);
    return NextResponse.json({ 
      error: 'Failed to reset onboarding',
      details: error.message 
    }, { status: 500 });
  }
}

