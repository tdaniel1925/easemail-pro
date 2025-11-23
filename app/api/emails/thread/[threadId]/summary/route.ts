import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emails } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateThreadSummary } from '@/lib/ai/thread-analyzer';

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;

    if (!threadId) {
      return NextResponse.json({ success: false, error: 'Thread ID required' }, { status: 400 });
    }

    console.log(`[Thread Summary] Fetching thread: ${threadId} for user: ${user.id}`);

    // Fetch all emails in this thread for this user
    const threadEmails = await db
      .select({
        id: emails.id,
        subject: emails.subject,
        fromName: emails.fromName,
        fromEmail: emails.fromEmail,
        toEmails: emails.toEmails,
        snippet: emails.snippet,
        bodyPlainText: emails.bodyPlainText,
        bodyHtml: emails.bodyHtml,
        receivedAt: emails.receivedAt,
        isRead: emails.isRead,
        inReplyTo: emails.inReplyTo,
        emailReferences: emails.emailReferences,
      })
      .from(emails)
      .where(
        and(
          eq(emails.userId, user.id),
          eq(emails.threadId, threadId)
        )
      )
      .orderBy(desc(emails.receivedAt));

    if (threadEmails.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No emails found in this thread'
      }, { status: 404 });
    }

    console.log(`[Thread Summary] Found ${threadEmails.length} emails in thread`);

    // Extract participants
    const participantsMap = new Map<string, { name: string; email: string; count: number }>();

    threadEmails.forEach((email) => {
      // Add sender
      if (email.fromEmail) {
        const key = email.fromEmail.toLowerCase();
        if (participantsMap.has(key)) {
          participantsMap.get(key)!.count++;
        } else {
          participantsMap.set(key, {
            name: email.fromName || email.fromEmail,
            email: email.fromEmail,
            count: 1,
          });
        }
      }

      // Add recipients
      if (email.toEmails && Array.isArray(email.toEmails)) {
        email.toEmails.forEach((recipient: any) => {
          if (recipient.email) {
            const key = recipient.email.toLowerCase();
            if (!participantsMap.has(key)) {
              participantsMap.set(key, {
                name: recipient.name || recipient.email,
                email: recipient.email,
                count: 0,
              });
            }
          }
        });
      }
    });

    const participants = Array.from(participantsMap.values())
      .sort((a, b) => b.count - a.count);

    // Calculate dates
    const sortedByDate = [...threadEmails].sort((a, b) =>
      new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
    );
    const startDate = sortedByDate[0].receivedAt;
    const lastActivity = sortedByDate[sortedByDate.length - 1].receivedAt;

    // Generate AI summary
    console.log('[Thread Summary] Generating AI summary...');
    const aiAnalysis = await generateThreadSummary(threadEmails);

    // Format response
    const summary = {
      threadId,
      emailCount: threadEmails.length,
      participants,
      startDate,
      lastActivity,
      aiSummary: aiAnalysis.summary,
      keyTopics: aiAnalysis.keyTopics,
      sentiment: aiAnalysis.sentiment,
      emails: threadEmails.map((email) => ({
        id: email.id,
        subject: email.subject || '(No Subject)',
        fromName: email.fromName || email.fromEmail || 'Unknown',
        fromEmail: email.fromEmail || '',
        snippet: email.snippet || '',
        receivedAt: email.receivedAt,
        isRead: email.isRead || false,
      })),
    };

    console.log('[Thread Summary] Summary generated successfully');

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('[Thread Summary] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate thread summary' },
      { status: 500 }
    );
  }
}
