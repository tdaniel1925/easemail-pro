/**
 * Recipient History API
 * Fetches email addresses from previously sent emails for autocomplete
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recipients/history?query=john
 * Returns unique email addresses from sent emails that match the query
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('📧 Fetching recipient history:', { query, limit });

    // Get all sent emails for this user
    // We'll extract recipients from toEmails, ccEmails, bccEmails
    const sentEmails = await db
      .select({
        toEmails: emails.toEmails,
        ccEmails: emails.ccEmails,
        bccEmails: emails.bccEmails,
        sentAt: emails.sentAt,
      })
      .from(emails)
      .innerJoin(
        sql`email_accounts`,
        sql`emails.account_id = email_accounts.id`
      )
      .where(
        and(
          sql`email_accounts.user_id = ${user.id}`,
          sql`emails.folder = 'sent' OR emails.is_draft = false`
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(500); // Get last 500 sent emails for performance

    // Extract and deduplicate recipients
    const recipientMap = new Map<string, { email: string; name?: string; lastUsed: Date }>();

    for (const email of sentEmails) {
      const allRecipients = [
        ...(email.toEmails || []),
        ...(email.ccEmails || []),
        ...(email.bccEmails || []),
      ] as Array<{ email: string; name?: string }>;

      for (const recipient of allRecipients) {
        if (recipient.email) {
          const emailLower = recipient.email.toLowerCase();

          // If query is provided, filter by email or name
          if (query) {
            const nameLower = recipient.name?.toLowerCase() || '';
            if (!emailLower.includes(query) && !nameLower.includes(query)) {
              continue;
            }
          }

          // Keep the most recent usage of each email
          const existing = recipientMap.get(emailLower);
          const sentAt = email.sentAt ? new Date(email.sentAt) : new Date();

          if (!existing || sentAt > existing.lastUsed) {
            recipientMap.set(emailLower, {
              email: recipient.email,
              name: recipient.name,
              lastUsed: sentAt,
            });
          }
        }
      }
    }

    // Convert to array and sort by most recently used
    const recipients = Array.from(recipientMap.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, limit)
      .map(({ email, name }) => ({
        email,
        name,
        displayText: name ? `${name} <${email}>` : email,
      }));

    console.log('✅ Found recipients:', recipients.length);

    return NextResponse.json({
      success: true,
      recipients,
    });
  } catch (error: any) {
    console.error('❌ Recipient history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recipient history',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
