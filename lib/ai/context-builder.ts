/**
 * AI Context Builder
 * Builds comprehensive context for AI assistant
 * Gives AI access to all user data
 */

import Nylas from 'nylas';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema-contacts-v4';
import { emails, emailAccounts, calendarEvents } from '@/lib/db/schema';
import { eq, and, desc, or, sql, gte, lte } from 'drizzle-orm';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

export interface AIContext {
  user: {
    id: string;
    email: string;
  };
  emails: {
    recent: any[];
    unread_count: number;
    important: any[];
  };
  contacts: {
    total: number;
    recent: any[];
    frequent: any[];
  };
  calendar: {
    today: any[];
    upcoming: any[];
    next_meeting: any | null;
  };
  tasks: {
    pending: any[];
    overdue: any[];
  };
  insights: {
    unread_from_important_senders: number;
    meetings_today: number;
    deadlines_this_week: number;
  };
  metadata: {
    built_at: Date;
    account_id: string;
  };
}

/**
 * Build comprehensive AI context for a user
 */
export async function buildAIContext(userId: string, nylasGrantId: string): Promise<AIContext> {
  console.log(`[AI Context] Building context for user ${userId}, nylasGrantId ${nylasGrantId}`);

  try {
    // First, get the database account ID from the Nylas Grant ID
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, nylasGrantId),
    });

    if (!account) {
      console.error(`[AI Context] Account not found for nylasGrantId ${nylasGrantId}`);
      throw new Error('Account not found');
    }

    const dbAccountId = account.id;
    console.log(`[AI Context] Found database account ID: ${dbAccountId} for nylasGrantId: ${nylasGrantId}`);

    // Fetch data in parallel for speed
    const [
      recentEmails,
      unreadEmails,
      upcomingEvents,
      todayEvents,
      contacts,
    ] = await Promise.all([
      fetchRecentEmails(dbAccountId, 20),
      fetchUnreadEmails(dbAccountId, 50),
      fetchUpcomingEvents(userId, 7), // next 7 days - CHANGED: now uses userId instead of accountId
      fetchTodayEvents(userId), // CHANGED: now uses userId instead of accountId
      fetchContacts(userId, nylasGrantId, 50),
    ]);

    // Analyze and summarize
    const importantEmails = unreadEmails.filter((email: any) =>
      email.starred || email.labels?.includes('important')
    ).slice(0, 5);

    const nextMeeting = findNextMeeting(upcomingEvents);

    // Build insights
    const insights = {
      unread_from_important_senders: countImportantUnread(unreadEmails, contacts),
      meetings_today: todayEvents.length,
      deadlines_this_week: 0, // TODO: Extract from emails/calendar
    };

    const context: AIContext = {
      user: {
        id: userId,
        email: '', // Will be filled from account
      },
      emails: {
        recent: recentEmails.slice(0, 10), // Limit to 10 for token efficiency
        unread_count: unreadEmails.length,
        important: importantEmails,
      },
      contacts: {
        total: contacts.length,
        recent: contacts.slice(0, 10),
        frequent: identifyFrequentContacts(recentEmails, contacts).slice(0, 5),
      },
      calendar: {
        today: todayEvents,
        upcoming: upcomingEvents.slice(0, 5),
        next_meeting: nextMeeting,
      },
      tasks: {
        pending: [], // TODO: Extract from emails/notes
        overdue: [],
      },
      insights,
      metadata: {
        built_at: new Date(),
        account_id: nylasGrantId,
      },
    };

    console.log(`[AI Context] Built context with ${recentEmails.length} emails, ${contacts.length} contacts, ${upcomingEvents.length} events`);
    console.log(`[AI Context] Final context summary:`, {
      emails_recent: context.emails.recent.length,
      emails_unread: context.emails.unread_count,
      emails_important: context.emails.important.length,
      contacts_total: context.contacts.total,
      contacts_recent: context.contacts.recent.length,
      contacts_frequent: context.contacts.frequent.length,
      calendar_today: context.calendar.today.length,
      calendar_upcoming: context.calendar.upcoming.length,
      has_next_meeting: !!context.calendar.next_meeting,
    });

    // Log sample email subjects for debugging
    if (context.emails.recent.length > 0) {
      console.log(`[AI Context] Sample recent email subjects:`, context.emails.recent.slice(0, 3).map(e => e.subject));
    }

    return context;
  } catch (error) {
    console.error('[AI Context] Error building context:', error);
    throw error;
  }
}

/**
 * Fetch recent emails FROM DATABASE (not Nylas API)
 */
async function fetchRecentEmails(accountId: string, limit: number = 20): Promise<any[]> {
  try {
    console.log(`[AI Context] Fetching recent emails from DATABASE for account ${accountId}, limit ${limit}`);

    // Fetch emails from local database
    const recentEmails = await db.query.emails.findMany({
      where: and(
        eq(emails.accountId, accountId),
        eq(emails.isTrashed, false)
      ),
      orderBy: desc(emails.receivedAt),
      limit,
    });

    console.log(`[AI Context] Fetched ${recentEmails.length} recent emails from database`);
    if (recentEmails.length > 0) {
      console.log(`[AI Context] Sample email: "${recentEmails[0].subject}" from ${recentEmails[0].fromEmail}`);
    } else {
      console.warn(`[AI Context] WARNING: No emails found in database for account ${accountId}`);
    }

    return recentEmails.map((email: any) => ({
      id: email.id,
      subject: email.subject,
      from: [{ email: email.fromEmail, name: email.fromName }],
      to: email.toEmails || [],
      date: email.receivedAt,
      snippet: email.snippet,
      bodyText: email.bodyText, // ✅ Added full body text for AI analysis
      unread: email.isRead === false,
      starred: email.isStarred,
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching recent emails from database:', error);
    console.error('[AI Context] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Fetch unread emails FROM DATABASE (not Nylas API)
 */
async function fetchUnreadEmails(accountId: string, limit: number = 50): Promise<any[]> {
  try {
    console.log(`[AI Context] Fetching unread emails from DATABASE for account ${accountId}, limit ${limit}`);

    const unreadEmails = await db.query.emails.findMany({
      where: and(
        eq(emails.accountId, accountId),
        eq(emails.isRead, false),
        eq(emails.isTrashed, false)
      ),
      orderBy: desc(emails.receivedAt),
      limit,
    });

    console.log(`[AI Context] Fetched ${unreadEmails.length} unread emails from database`);
    return unreadEmails;
  } catch (error) {
    console.error('[AI Context] Error fetching unread emails from database:', error);
    console.error('[AI Context] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Fetch upcoming calendar events FROM DATABASE (not Nylas API)
 */
async function fetchUpcomingEvents(userId: string, days: number = 7): Promise<any[]> {
  try {
    console.log(`[AI Context] Fetching upcoming events from DATABASE for user ${userId}, next ${days} days`);

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const events = await db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startTime, now),
        lte(calendarEvents.startTime, endDate)
      ),
      orderBy: calendarEvents.startTime,
      limit: 20,
    });

    console.log(`[AI Context] Fetched ${events.length} upcoming events from database`);

    return events.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start_time: Math.floor(event.startTime.getTime() / 1000),
      end_time: Math.floor(event.endTime.getTime() / 1000),
      participants: event.attendees || [],
      organizer: { email: event.organizerEmail },
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching upcoming events from database:', error);
    console.error('[AI Context] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Fetch today's calendar events FROM DATABASE (not Nylas API)
 */
async function fetchTodayEvents(userId: string): Promise<any[]> {
  try {
    console.log(`[AI Context] Fetching today's events from DATABASE for user ${userId}`);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const events = await db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startTime, startOfDay),
        lte(calendarEvents.startTime, endOfDay)
      ),
      orderBy: calendarEvents.startTime,
      limit: 20,
    });

    console.log(`[AI Context] Fetched ${events.length} events for today from database`);

    return events.map((event: any) => ({
      id: event.id,
      title: event.title,
      start_time: Math.floor(event.startTime.getTime() / 1000),
      end_time: Math.floor(event.endTime.getTime() / 1000),
      location: event.location,
      participants: event.attendees || [],
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching today events from database:', error);
    console.error('[AI Context] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Fetch contacts
 */
async function fetchContacts(userId: string, accountId: string, limit: number = 50): Promise<any[]> {
  try {
    console.log(`[AI Context] Fetching contacts for user ${userId}, limit ${limit}`);
    const contacts = await db.query.contactsV4.findMany({
      where: and(
        eq(contactsV4.userId, userId),
        eq(contactsV4.isDeleted, false)
      ),
      limit,
      orderBy: contactsV4.updatedAt,
    });

    console.log(`[AI Context] Fetched ${contacts.length} contacts`);
    return contacts.map((contact: any) => ({
      id: contact.id,
      name: contact.displayName,
      email: contact.emails?.[0]?.email,
      company: contact.companyName,
      job_title: contact.jobTitle,
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching contacts:', error);
    console.error('[AI Context] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Find the next upcoming meeting
 */
function findNextMeeting(events: any[]): any | null {
  const now = Date.now() / 1000;
  const upcoming = events
    .filter((event: any) => event.start_time > now)
    .sort((a: any, b: any) => a.start_time - b.start_time);

  return upcoming.length > 0 ? upcoming[0] : null;
}

/**
 * Count unread emails from important senders
 */
function countImportantUnread(unreadEmails: any[], contacts: any[]): number {
  const importantEmails = contacts.map((c: any) => c.email?.toLowerCase());
  return unreadEmails.filter((email: any) => {
    const senderEmail = email.from?.[0]?.email?.toLowerCase();
    return importantEmails.includes(senderEmail);
  }).length;
}

/**
 * Identify frequent contacts from recent emails
 */
function identifyFrequentContacts(recentEmails: any[], allContacts: any[]): any[] {
  const emailCounts = new Map<string, number>();

  // Count email frequency
  recentEmails.forEach((email: any) => {
    const senders = [...(email.from || []), ...(email.to || [])];
    senders.forEach((sender: any) => {
      const email = sender.email?.toLowerCase();
      if (email) {
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
      }
    });
  });

  // Sort contacts by frequency
  const sortedContacts = allContacts
    .map((contact: any) => ({
      ...contact,
      email_count: emailCounts.get(contact.email?.toLowerCase()) || 0,
    }))
    .filter((c: any) => c.email_count > 0)
    .sort((a: any, b: any) => b.email_count - a.email_count);

  return sortedContacts;
}

/**
 * Summarize context for AI prompt (token-efficient)
 */
export function summarizeContextForAI(context: AIContext): string {
  const summary = `
User Context Summary:
- Unread Emails: ${context.emails.unread_count}
- Recent Emails: ${context.emails.recent.length}
- Important Unread: ${context.emails.important.length}
- Contacts: ${context.contacts.total} total, ${context.contacts.frequent.length} frequent
- Meetings Today: ${context.insights.meetings_today}
- Next Meeting: ${context.calendar.next_meeting ? context.calendar.next_meeting.title : 'None'}

Recent Email Subjects:
${context.emails.recent.slice(0, 5).map((e: any) => `- ${e.subject} (from ${e.from?.[0]?.name || e.from?.[0]?.email})`).join('\n')}

Today's Meetings:
${context.calendar.today.map((e: any) => `- ${e.title} at ${new Date(e.start_time * 1000).toLocaleTimeString()}`).join('\n') || '- None'}

Frequent Contacts:
${context.contacts.frequent.map((c: any) => `- ${c.name} (${c.email})`).join('\n')}
`.trim();

  return summary;
}
