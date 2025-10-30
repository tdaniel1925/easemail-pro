import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // For testing without auth, use default test user ID
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
    
    // Get all accounts for user
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, userId),
      orderBy: (accounts, { desc }) => [desc(accounts.isDefault), desc(accounts.createdAt)],
    });
    
    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    console.error('Accounts fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

