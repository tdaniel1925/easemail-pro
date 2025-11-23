import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emails, emailAccounts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the database account ID
    const { searchParams } = new URL(request.url);
    const nylasGrantId = searchParams.get('accountId') || '758ac167-5308-4dce-815e-5bd92a9e73bc';

    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, nylasGrantId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Fetch last 20 emails
    const recentEmails = await db.query.emails.findMany({
      where: and(
        eq(emails.accountId, account.id),
        eq(emails.isTrashed, false)
      ),
      orderBy: desc(emails.receivedAt),
      limit: 20,
    });

    // Return formatted data
    return NextResponse.json({
      accountId: account.id,
      nylasGrantId,
      emailCount: recentEmails.length,
      emails: recentEmails.map(email => ({
        subject: email.subject,
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        receivedAt: email.receivedAt,
      }))
    });
  } catch (error: any) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
