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

    const body = await request.json();
    const { step } = body;

    if (typeof step !== 'number' || step < 0 || step > 7) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
    }

    // Update current step
    await db.update(users)
      .set({ onboardingStep: step })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true, step });
  } catch (error: any) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json({ 
      error: 'Failed to update onboarding progress',
      details: error.message 
    }, { status: 500 });
  }
}

