/**
 * AI Context Builder
 * Builds comprehensive context for AI assistant
 * Gives AI access to all user data
 */

import Nylas from 'nylas';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema-contacts-v4';
import { eq, and } from 'drizzle-orm';

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
export async function buildAIContext(userId: string, accountId: string): Promise<AIContext> {
  console.log(`[AI Context] Building context for user ${userId}, account ${accountId}`);

  try {
    // Fetch data in parallel for speed
    const [
      recentEmails,
      unreadEmails,
      upcomingEvents,
      todayEvents,
      contacts,
    ] = await Promise.all([
      fetchRecentEmails(accountId, 20),
      fetchUnreadEmails(accountId, 50),
      fetchUpcomingEvents(accountId, 7), // next 7 days
      fetchTodayEvents(accountId),
      fetchContacts(userId, accountId, 50),
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
        account_id: accountId,
      },
    };

    console.log(`[AI Context] Built context with ${recentEmails.length} emails, ${contacts.length} contacts, ${upcomingEvents.length} events`);

    return context;
  } catch (error) {
    console.error('[AI Context] Error building context:', error);
    throw error;
  }
}

/**
 * Fetch recent emails
 */
async function fetchRecentEmails(accountId: string, limit: number = 20): Promise<any[]> {
  try {
    const messages = await nylas.messages.list({
      identifier: accountId,
      queryParams: {
        limit,
        in: ['inbox', 'sent'],
      },
    });

    return messages.data.map((msg: any) => ({
      id: msg.id,
      subject: msg.subject,
      from: msg.from,
      to: msg.to,
      date: msg.date,
      snippet: msg.snippet,
      unread: msg.unread,
      starred: msg.starred,
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching recent emails:', error);
    return [];
  }
}

/**
 * Fetch unread emails
 */
async function fetchUnreadEmails(accountId: string, limit: number = 50): Promise<any[]> {
  try {
    const messages = await nylas.messages.list({
      identifier: accountId,
      queryParams: {
        limit,
        unread: true,
      },
    });

    return messages.data;
  } catch (error) {
    console.error('[AI Context] Error fetching unread emails:', error);
    return [];
  }
}

/**
 * Fetch upcoming calendar events
 */
async function fetchUpcomingEvents(accountId: string, days: number = 7): Promise<any[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (days * 24 * 60 * 60);

    const events = await nylas.events.list({
      identifier: accountId,
      queryParams: {
        start: now.toString(),
        end: endTime.toString(),
        limit: 20,
      } as any,
    });

    return events.data.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start_time: event.when?.startTime || event.when?.date,
      end_time: event.when?.endTime || event.when?.date,
      participants: event.participants,
      organizer: event.organizer,
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching upcoming events:', error);
    return [];
  }
}

/**
 * Fetch today's calendar events
 */
async function fetchTodayEvents(accountId: string): Promise<any[]> {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const events = await nylas.events.list({
      identifier: accountId,
      queryParams: {
        start: Math.floor(startOfDay.getTime() / 1000).toString(),
        end: Math.floor(endOfDay.getTime() / 1000).toString(),
        limit: 20,
      } as any,
    });

    return events.data.map((event: any) => ({
      id: event.id,
      title: event.title,
      start_time: event.when?.startTime || event.when?.date,
      end_time: event.when?.endTime || event.when?.date,
      location: event.location,
      participants: event.participants,
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching today events:', error);
    return [];
  }
}

/**
 * Fetch contacts
 */
async function fetchContacts(userId: string, accountId: string, limit: number = 50): Promise<any[]> {
  try {
    const contacts = await db.query.contactsV4.findMany({
      where: and(
        eq(contactsV4.userId, userId),
        eq(contactsV4.isDeleted, false)
      ),
      limit,
      orderBy: contactsV4.updatedAt,
    });

    return contacts.map((contact: any) => ({
      id: contact.id,
      name: contact.displayName,
      email: contact.emails?.[0]?.email,
      company: contact.companyName,
      job_title: contact.jobTitle,
    }));
  } catch (error) {
    console.error('[AI Context] Error fetching contacts:', error);
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
