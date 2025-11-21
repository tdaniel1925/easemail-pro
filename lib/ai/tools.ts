/**
 * AI Tools - Functions the AI can call
 * These give the AI ability to search and interact with user data
 */

/**
 * AI Tool Definitions for OpenAI Function Calling
 */
export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_emails',
      description: 'Search through user emails. Use this when user asks about specific emails, senders, or topics.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query. Supports filters like from:, to:, subject:, has:attachment, is:unread',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_contacts',
      description: 'Search through user contacts. Use when user asks about people, contact information, or relationships.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (name, email, company)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_events',
      description: 'Search calendar events. Use when user asks about meetings, appointments, or schedules.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (title, location, participants)',
          },
          days: {
            type: 'number',
            description: 'Search within next N days (default: 30)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_email_thread',
      description: 'Get full email conversation thread. Use when user wants to see the complete email exchange.',
      parameters: {
        type: 'object',
        properties: {
          thread_id: {
            type: 'string',
            description: 'The thread ID to fetch',
          },
        },
        required: ['thread_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_history',
      description: 'Get all interactions with a specific contact (emails, meetings). Use when user asks about communication history.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Contact email address',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_emails',
      description: 'Summarize multiple emails at once. Use when user wants a digest or overview of emails.',
      parameters: {
        type: 'object',
        properties: {
          email_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of email IDs to summarize',
          },
        },
        required: ['email_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_email_reply',
      description: 'Generate a draft reply to an email. Use when user wants help composing a response.',
      parameters: {
        type: 'object',
        properties: {
          email_id: {
            type: 'string',
            description: 'The email ID to reply to',
          },
          instructions: {
            type: 'string',
            description: 'User instructions for the reply (tone, content, etc.)',
          },
        },
        required: ['email_id', 'instructions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_available_meeting_times',
      description: 'Find available time slots for meetings. Use when user wants to schedule a meeting.',
      parameters: {
        type: 'object',
        properties: {
          duration_minutes: {
            type: 'number',
            description: 'Meeting duration in minutes',
          },
          days_ahead: {
            type: 'number',
            description: 'Look ahead N days (default: 7)',
          },
        },
        required: ['duration_minutes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_unread_summary',
      description: 'Get summary of unread emails, grouped by sender or topic. Use when user asks "what did I miss" or "catch me up".',
      parameters: {
        type: 'object',
        properties: {
          group_by: {
            type: 'string',
            enum: ['sender', 'date', 'importance'],
            description: 'How to group the summary',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_email_sentiment',
      description: 'Analyze the sentiment/tone of an email. Use when user wants to know if an email is urgent, positive, negative, etc.',
      parameters: {
        type: 'object',
        properties: {
          email_id: {
            type: 'string',
            description: 'Email ID to analyze',
          },
        },
        required: ['email_id'],
      },
    },
  },
];

/**
 * Execute an AI tool function
 */
export async function executeAITool(
  toolName: string,
  args: any,
  context: { userId: string; accountId: string }
): Promise<any> {
  console.log(`[AI Tools] Executing ${toolName} with args:`, args);

  try {
    switch (toolName) {
      case 'search_emails':
        return await searchEmails(args.query, context.accountId, args.limit);

      case 'search_contacts':
        return await searchContacts(args.query, context.userId, args.limit);

      case 'search_events':
        return await searchEvents(args.query, context.accountId, args.days);

      case 'get_email_thread':
        return await getEmailThread(args.thread_id, context.accountId);

      case 'get_contact_history':
        return await getContactHistory(args.email, context.accountId);

      case 'summarize_emails':
        return await summarizeEmails(args.email_ids, context.accountId);

      case 'draft_email_reply':
        return await draftEmailReply(args.email_id, args.instructions, context.accountId);

      case 'find_available_meeting_times':
        return await findAvailableMeetingTimes(args.duration_minutes, context.accountId, args.days_ahead);

      case 'get_unread_summary':
        return await getUnreadSummary(context.accountId, args.group_by);

      case 'analyze_email_sentiment':
        return await analyzeEmailSentiment(args.email_id, context.accountId);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    console.error(`[AI Tools] Error executing ${toolName}:`, error);
    return { error: `Failed to execute ${toolName}: ${error.message}` };
  }
}

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

async function searchEmails(query: string, accountId: string, limit: number = 10) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search/emails?accountId=${accountId}&query=${encodeURIComponent(query)}&limit=${limit}`
  );
  const data = await response.json();
  return { emails: data.emails || [] };
}

async function searchContacts(query: string, userId: string, limit: number = 10) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/contacts-v4/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  const data = await response.json();
  return { contacts: data.contacts || [] };
}

async function searchEvents(query: string, accountId: string, days: number = 30) {
  const end = new Date();
  end.setDate(end.getDate() + days);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search/events?accountId=${accountId}&query=${encodeURIComponent(query)}&end=${end.toISOString()}`
  );
  const data = await response.json();
  return { events: data.events || [] };
}

async function getEmailThread(threadId: string, accountId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nylas-v3/threads/${threadId}?accountId=${accountId}`
  );
  const data = await response.json();
  return { thread: data.thread || null };
}

async function getContactHistory(email: string, accountId: string) {
  // Search for all emails from/to this contact
  const [sentEmails, receivedEmails] = await Promise.all([
    searchEmails(`to:${email}`, accountId, 20),
    searchEmails(`from:${email}`, accountId, 20),
  ]);

  return {
    sent: sentEmails.emails,
    received: receivedEmails.emails,
    total_interactions: sentEmails.emails.length + receivedEmails.emails.length,
  };
}

async function summarizeEmails(emailIds: string[], accountId: string) {
  // Fetch each email and create a summary
  const summaries = [];
  for (const emailId of emailIds.slice(0, 10)) { // Limit to 10
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nylas-v3/messages/${emailId}?accountId=${accountId}`
      );
      const data = await response.json();
      if (data.success) {
        summaries.push({
          id: emailId,
          subject: data.message.subject,
          from: data.message.from,
          snippet: data.message.snippet,
        });
      }
    } catch (err) {
      console.error(`Error fetching email ${emailId}:`, err);
    }
  }

  return { summaries };
}

async function draftEmailReply(emailId: string, instructions: string, accountId: string) {
  // This would integrate with your AI to generate the reply
  // For now, return a placeholder
  return {
    draft: `Draft reply based on: ${instructions}`,
    instructions: 'Use EmailCompose component to send this',
  };
}

async function findAvailableMeetingTimes(durationMinutes: number, accountId: string, daysAhead: number = 7) {
  // Fetch calendar events for the next N days
  const response = await searchEvents('', accountId, daysAhead);
  const events = response.events;

  // Find gaps in the calendar
  const availableSlots = [];
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  // Simple implementation: find morning (9-12) and afternoon (2-5) slots
  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);

    // Check if day has conflicts
    const dayStr = day.toISOString().split('T')[0];
    const dayEvents = events.filter((e: any) => {
      const eventDay = new Date(e.start_time * 1000).toISOString().split('T')[0];
      return eventDay === dayStr;
    });

    if (dayEvents.length === 0) {
      availableSlots.push({
        date: dayStr,
        time: '9:00 AM - 12:00 PM',
        duration_minutes: durationMinutes,
      });
    }
  }

  return { available_slots: availableSlots.slice(0, 5) };
}

async function getUnreadSummary(accountId: string, groupBy: string = 'sender') {
  const response = await searchEmails('is:unread', accountId, 50);
  const unreadEmails = response.emails;

  if (groupBy === 'sender') {
    const grouped = new Map<string, any[]>();
    unreadEmails.forEach((email: any) => {
      const sender = email.from?.[0]?.email || 'unknown';
      if (!grouped.has(sender)) {
        grouped.set(sender, []);
      }
      grouped.get(sender)!.push(email);
    });

    const summary = Array.from(grouped.entries()).map(([sender, emails]) => ({
      sender,
      count: emails.length,
      subjects: emails.slice(0, 3).map((e: any) => e.subject),
    }));

    return { summary, total_unread: unreadEmails.length };
  }

  return { unread_emails: unreadEmails, total: unreadEmails.length };
}

async function analyzeEmailSentiment(emailId: string, accountId: string) {
  // This would use AI to analyze sentiment
  // Placeholder implementation
  return {
    sentiment: 'neutral',
    urgency: 'medium',
    tone: 'professional',
    action_required: false,
  };
}
