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
      description: 'Search through ALL user emails in the database (including emails from years ago, 5000+ emails). ALWAYS use this tool when user asks about their emails - you do NOT have direct access to email content in your context. Use this for: counting emails from senders, finding emails by topic, checking if emails exist from someone, searching email content. Searches subject, body, and snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Text search query - searches in subject, body, and snippet',
          },
          from: {
            type: 'string',
            description: 'Filter by sender email address',
          },
          to: {
            type: 'string',
            description: 'Filter by recipient email address',
          },
          subject: {
            type: 'string',
            description: 'Filter by subject line',
          },
          dateFrom: {
            type: 'string',
            description: 'Start date in ISO format (e.g., 2023-01-01)',
          },
          dateTo: {
            type: 'string',
            description: 'End date in ISO format (e.g., 2024-12-31)',
          },
          isUnread: {
            type: 'boolean',
            description: 'Filter for unread emails only',
          },
          isStarred: {
            type: 'boolean',
            description: 'Filter for starred emails only',
          },
          hasAttachment: {
            type: 'boolean',
            description: 'Filter for emails with attachments',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 100, max: 1000)',
          },
        },
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
  // ============================================
  // EMAIL ACTION TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send a new email. Use when user asks to send an email, compose a message, or email someone.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
              },
            },
            description: 'Recipients (email addresses)',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body content (HTML or plain text)',
          },
          cc: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
              },
            },
            description: 'CC recipients',
          },
          bcc: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
              },
            },
            description: 'BCC recipients',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reply_to_email',
      description: 'Reply to an email. Use when user asks to reply to a specific email.',
      parameters: {
        type: 'object',
        properties: {
          email_id: {
            type: 'string',
            description: 'The email ID to reply to',
          },
          body: {
            type: 'string',
            description: 'Reply body content',
          },
          reply_all: {
            type: 'boolean',
            description: 'Whether to reply to all recipients (default: false)',
          },
        },
        required: ['email_id', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_email_read',
      description: 'Mark email(s) as read or unread.',
      parameters: {
        type: 'object',
        properties: {
          email_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email IDs to mark',
          },
          read: {
            type: 'boolean',
            description: 'True to mark as read, false to mark as unread',
          },
        },
        required: ['email_ids', 'read'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'star_email',
      description: 'Star or unstar email(s).',
      parameters: {
        type: 'object',
        properties: {
          email_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email IDs to star/unstar',
          },
          starred: {
            type: 'boolean',
            description: 'True to star, false to unstar',
          },
        },
        required: ['email_ids', 'starred'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_email',
      description: 'Delete email(s) or move to trash.',
      parameters: {
        type: 'object',
        properties: {
          email_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email IDs to delete',
          },
        },
        required: ['email_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_email',
      description: 'Archive email(s).',
      parameters: {
        type: 'object',
        properties: {
          email_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email IDs to archive',
          },
        },
        required: ['email_ids'],
      },
    },
  },
  // ============================================
  // CALENDAR ACTION TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new calendar event or appointment. Use when user asks to schedule a meeting, set up an appointment, or add to calendar.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Event title',
          },
          start_time: {
            type: 'string',
            description: 'Start time in ISO format (e.g., 2024-01-15T14:00:00)',
          },
          end_time: {
            type: 'string',
            description: 'End time in ISO format',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          location: {
            type: 'string',
            description: 'Event location',
          },
          attendees: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
              },
            },
            description: 'Event attendees',
          },
        },
        required: ['title', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_calendar_event',
      description: 'Update an existing calendar event.',
      parameters: {
        type: 'object',
        properties: {
          event_id: {
            type: 'string',
            description: 'Event ID to update',
          },
          title: {
            type: 'string',
            description: 'New event title',
          },
          start_time: {
            type: 'string',
            description: 'New start time in ISO format',
          },
          end_time: {
            type: 'string',
            description: 'New end time in ISO format',
          },
          description: {
            type: 'string',
            description: 'New description',
          },
          location: {
            type: 'string',
            description: 'New location',
          },
        },
        required: ['event_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_calendar_event',
      description: 'Delete a calendar event.',
      parameters: {
        type: 'object',
        properties: {
          event_id: {
            type: 'string',
            description: 'Event ID to delete',
          },
        },
        required: ['event_id'],
      },
    },
  },
  // ============================================
  // CONTACT ACTION TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_contact',
      description: 'Create a new contact.',
      parameters: {
        type: 'object',
        properties: {
          given_name: {
            type: 'string',
            description: 'First name',
          },
          surname: {
            type: 'string',
            description: 'Last name',
          },
          email: {
            type: 'string',
            description: 'Email address',
          },
          company_name: {
            type: 'string',
            description: 'Company name',
          },
          job_title: {
            type: 'string',
            description: 'Job title',
          },
          phone: {
            type: 'string',
            description: 'Phone number',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_contact',
      description: 'Update an existing contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'Contact ID to update',
          },
          given_name: {
            type: 'string',
            description: 'New first name',
          },
          surname: {
            type: 'string',
            description: 'New last name',
          },
          email: {
            type: 'string',
            description: 'New email address',
          },
          company_name: {
            type: 'string',
            description: 'New company name',
          },
          job_title: {
            type: 'string',
            description: 'New job title',
          },
        },
        required: ['contact_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_contact',
      description: 'Delete a contact.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'Contact ID to delete',
          },
        },
        required: ['contact_id'],
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
        return await searchEmails(args.query || '', context.accountId, args.limit || 100, args);

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

      // Email actions
      case 'send_email':
        return await sendEmail(args, context.accountId);

      case 'reply_to_email':
        return await replyToEmail(args.email_id, args.body, context.accountId, args.reply_all);

      case 'mark_email_read':
        return await markEmailRead(args.email_ids, args.read, context.accountId);

      case 'star_email':
        return await starEmail(args.email_ids, args.starred, context.accountId);

      case 'delete_email':
        return await deleteEmail(args.email_ids, context.accountId);

      case 'archive_email':
        return await archiveEmail(args.email_ids, context.accountId);

      // Calendar actions
      case 'create_calendar_event':
        return await createCalendarEvent(args, context.accountId);

      case 'update_calendar_event':
        return await updateCalendarEvent(args, context.accountId);

      case 'delete_calendar_event':
        return await deleteCalendarEvent(args.event_id, context.accountId);

      // Contact actions
      case 'create_contact':
        return await createContact(args, context.userId);

      case 'update_contact':
        return await updateContact(args, context.userId);

      case 'delete_contact':
        return await deleteContact(args.contact_id, context.userId);

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

async function searchEmails(query: string, accountId: string, limit: number = 100, filters?: any) {
  // Call Nylas API directly from server side (bypass Next.js API routes to avoid auth issues)
  try {
    console.log(`[AI Tools] searchEmails: accountId=${accountId}, from=${filters?.from}, limit=${limit}`);

    const { fetchMessages } = await import('@/lib/nylas-v3/messages');

    // Fetch messages from Nylas API
    const fetchLimit = Math.min(limit * 3, 1000); // Fetch more than needed for filtering
    const result = await fetchMessages({
      grantId: accountId,
      limit: fetchLimit,
      unread: filters?.isUnread === true ? true : filters?.isUnread === false ? false : undefined,
    });

    let messages = result.messages;
    console.log(`[AI Tools] Fetched ${messages.length} messages from Nylas API`);

    // Client-side filtering
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      messages = messages.filter((msg: any) => {
        const subject = (msg.subject || '').toLowerCase();
        const snippet = (msg.snippet || '').toLowerCase();
        const body = (msg.body || '').toLowerCase();
        return subject.includes(searchTerm) || snippet.includes(searchTerm) || body.includes(searchTerm);
      });
    }

    if (filters?.from) {
      const fromTerm = filters.from.toLowerCase();
      messages = messages.filter((msg: any) => {
        const senderEmail = (msg.from?.[0]?.email || '').toLowerCase();
        const senderName = (msg.from?.[0]?.name || '').toLowerCase();
        return senderEmail.includes(fromTerm) || senderName.includes(fromTerm);
      });
    }

    if (filters?.to) {
      const toTerm = filters.to.toLowerCase();
      messages = messages.filter((msg: any) => {
        return msg.to?.some((recipient: any) => {
          const email = (recipient.email || '').toLowerCase();
          const name = (recipient.name || '').toLowerCase();
          return email.includes(toTerm) || name.includes(toTerm);
        });
      });
    }

    if (filters?.subject) {
      const subjectTerm = filters.subject.toLowerCase();
      messages = messages.filter((msg: any) => {
        return (msg.subject || '').toLowerCase().includes(subjectTerm);
      });
    }

    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom).getTime() / 1000;
      messages = messages.filter((msg: any) => msg.date >= fromDate);
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo).getTime() / 1000;
      messages = messages.filter((msg: any) => msg.date <= toDate);
    }

    if (filters?.isStarred === true) {
      messages = messages.filter((msg: any) => msg.starred === true);
    }

    if (filters?.hasAttachment === true) {
      messages = messages.filter((msg: any) => (msg.attachments?.length || 0) > 0);
    }

    // Limit results
    messages = messages.slice(0, limit);

    console.log(`[AI Tools] After filtering: ${messages.length} messages match the search criteria`);
    if (messages.length > 0 && filters?.from) {
      console.log(`[AI Tools] First result:`, {
        subject: messages[0].subject,
        from: messages[0].from?.[0],
      });
    }

    return { emails: messages, total: messages.length, source: 'nylas-api' };
  } catch (error: any) {
    console.error('[AI Tools] searchEmails error:', error);
    return { emails: [], total: 0, source: 'nylas-api', error: error.message };
  }
}

async function searchContacts(query: string, userId: string, limit: number = 10) {
  // Query database directly (bypass API route to avoid auth issues)
  try {
    console.log(`[AI Tools] searchContacts: userId=${userId}, query=${query}, limit=${limit}`);

    const { db } = await import('@/lib/db/drizzle');
    const { contactsV4 } = await import('@/lib/db/schema-contacts-v4');
    const { and, eq, or, like, sql } = await import('drizzle-orm');

    const searchTerm = `%${query}%`;

    // Search in multiple fields
    const contacts = await db.query.contactsV4.findMany({
      where: and(
        eq(contactsV4.userId, userId),
        eq(contactsV4.isDeleted, false),
        or(
          like(contactsV4.displayName, searchTerm),
          like(contactsV4.givenName, searchTerm),
          like(contactsV4.surname, searchTerm),
          like(contactsV4.companyName, searchTerm),
          like(contactsV4.jobTitle, searchTerm),
          sql`${contactsV4.emails}::text ILIKE ${searchTerm}` // Search in JSON email array
        )
      ),
      limit,
    });

    console.log(`[AI Tools] Found ${contacts.length} contacts matching "${query}"`);

    return {
      contacts: contacts.map((c: any) => ({
        id: c.id,
        name: c.displayName,
        email: c.emails?.[0]?.email,
        company: c.companyName,
        job_title: c.jobTitle,
      }))
    };
  } catch (error: any) {
    console.error('[AI Tools] searchContacts error:', error);
    return { contacts: [], error: error.message };
  }
}

async function searchEvents(query: string, accountId: string, days: number = 30) {
  // Query database directly (bypass API route to avoid auth issues)
  try {
    console.log(`[AI Tools] searchEvents: accountId=${accountId}, query=${query}, days=${days}`);

    const { db } = await import('@/lib/db/drizzle');
    const { calendarEvents, emailAccounts } = await import('@/lib/db/schema');
    const { and, eq, gte, lte, or, like, sql } = await import('drizzle-orm');

    // Get userId from accountId (Nylas Grant ID)
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      console.error(`[AI Tools] Account not found for accountId ${accountId}`);
      return { events: [], error: 'Account not found' };
    }

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const searchTerm = `%${query}%`;

    // Search calendar events
    const events = await db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.userId, account.userId),
        gte(calendarEvents.startTime, now),
        lte(calendarEvents.startTime, endDate),
        query ? or(
          like(calendarEvents.title, searchTerm),
          like(calendarEvents.description, searchTerm),
          like(calendarEvents.location, searchTerm)
        ) : undefined
      ),
      orderBy: calendarEvents.startTime,
      limit: 20,
    });

    console.log(`[AI Tools] Found ${events.length} calendar events`);

    return {
      events: events.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        start_time: Math.floor(e.startTime.getTime() / 1000),
        end_time: Math.floor(e.endTime.getTime() / 1000),
        participants: e.attendees || [],
        organizer: { email: e.organizerEmail },
      }))
    };
  } catch (error: any) {
    console.error('[AI Tools] searchEvents error:', error);
    return { events: [], error: error.message };
  }
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
  try {
    // Fetch the email
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nylas-v3/messages/${emailId}?accountId=${accountId}`
    );
    const data = await response.json();

    if (!data.success || !data.message) {
      return { error: 'Failed to fetch email' };
    }

    const email = data.message;

    // Use OpenAI to analyze sentiment
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { AI_CONFIG } = await import('./config');
    const { createCompletionWithRetry } = await import('./retry');

    const prompt = `Analyze the sentiment and urgency of this email:

From: ${email.from?.[0]?.email || 'Unknown'}
Subject: ${email.subject || 'No subject'}
Body: ${email.snippet || email.body || 'No content'}

Respond with JSON only:
{
  "sentiment": "positive|neutral|negative",
  "urgency": "low|medium|high|critical",
  "tone": "professional|casual|formal|friendly|aggressive|concerned",
  "action_required": true/false,
  "reason": "Brief explanation of the analysis"
}`;

    const completion = await createCompletionWithRetry(
      () => openai.chat.completions.create({
        model: AI_CONFIG.models.default,
        messages: [{ role: 'user', content: prompt }],
        temperature: AI_CONFIG.temperature.factual,
        max_tokens: AI_CONFIG.maxTokens.analysis,
        response_format: { type: 'json_object' },
      }),
      'Sentiment Analysis'
    );

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error('[AI Tools] Sentiment analysis failed:', error);
    return {
      error: 'Sentiment analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// EMAIL ACTION TOOL IMPLEMENTATIONS
// ============================================

async function sendEmail(params: any, accountId: string) {
  try {
    console.log(`[AI Tools] sendEmail: to=${params.to?.[0]?.email}, subject=${params.subject}`);

    const { sendMessage } = await import('@/lib/nylas-v3/messages');

    const result = await sendMessage(accountId, {
      to: params.to,
      subject: params.subject,
      body: params.body,
      cc: params.cc,
      bcc: params.bcc,
    });

    console.log(`[AI Tools] ✅ Email sent successfully`);
    return { success: true, message: 'Email sent successfully', messageId: result.id };
  } catch (error: any) {
    console.error('[AI Tools] sendEmail error:', error);
    return { success: false, error: error.message };
  }
}

async function replyToEmail(emailId: string, body: string, accountId: string, replyAll: boolean = false) {
  try {
    console.log(`[AI Tools] replyToEmail: emailId=${emailId}, replyAll=${replyAll}`);

    const { fetchMessage, sendMessage } = await import('@/lib/nylas-v3/messages');

    // Fetch the original email to get reply-to details
    const originalEmail = await fetchMessage(accountId, emailId);

    const to = replyAll ? [...(originalEmail.from || []), ...(originalEmail.to || [])] : originalEmail.from || [];
    const cc = replyAll ? originalEmail.cc || [] : [];

    const result = await sendMessage(accountId, {
      to,
      cc,
      subject: `Re: ${originalEmail.subject || ''}`,
      body,
      replyToMessageId: emailId,
    });

    console.log(`[AI Tools] ✅ Reply sent successfully`);
    return { success: true, message: 'Reply sent successfully', messageId: result.id };
  } catch (error: any) {
    console.error('[AI Tools] replyToEmail error:', error);
    return { success: false, error: error.message };
  }
}

async function markEmailRead(emailIds: string[], read: boolean, accountId: string) {
  try {
    console.log(`[AI Tools] markEmailRead: ${emailIds.length} emails, read=${read}`);

    const { updateMessage } = await import('@/lib/nylas-v3/messages');

    const results = await Promise.all(
      emailIds.map(async (id) => {
        try {
          await updateMessage(accountId, id, { unread: !read });
          return { id, success: true };
        } catch (err: any) {
          return { id, success: false, error: err.message };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    console.log(`[AI Tools] ✅ Marked ${successful}/${emailIds.length} emails as ${read ? 'read' : 'unread'}`);

    return {
      success: true,
      message: `Marked ${successful} email(s) as ${read ? 'read' : 'unread'}`,
      results,
    };
  } catch (error: any) {
    console.error('[AI Tools] markEmailRead error:', error);
    return { success: false, error: error.message };
  }
}

async function starEmail(emailIds: string[], starred: boolean, accountId: string) {
  try {
    console.log(`[AI Tools] starEmail: ${emailIds.length} emails, starred=${starred}`);

    const { updateMessage } = await import('@/lib/nylas-v3/messages');

    const results = await Promise.all(
      emailIds.map(async (id) => {
        try {
          await updateMessage(accountId, id, { starred });
          return { id, success: true };
        } catch (err: any) {
          return { id, success: false, error: err.message };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    console.log(`[AI Tools] ✅ ${starred ? 'Starred' : 'Unstarred'} ${successful}/${emailIds.length} emails`);

    return {
      success: true,
      message: `${starred ? 'Starred' : 'Unstarred'} ${successful} email(s)`,
      results,
    };
  } catch (error: any) {
    console.error('[AI Tools] starEmail error:', error);
    return { success: false, error: error.message };
  }
}

async function deleteEmail(emailIds: string[], accountId: string) {
  try {
    console.log(`[AI Tools] deleteEmail: ${emailIds.length} emails`);

    const { deleteMessage } = await import('@/lib/nylas-v3/messages');

    const results = await Promise.all(
      emailIds.map(async (id) => {
        try {
          await deleteMessage(accountId, id);
          return { id, success: true };
        } catch (err: any) {
          return { id, success: false, error: err.message };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    console.log(`[AI Tools] ✅ Deleted ${successful}/${emailIds.length} emails`);

    return {
      success: true,
      message: `Deleted ${successful} email(s)`,
      results,
    };
  } catch (error: any) {
    console.error('[AI Tools] deleteEmail error:', error);
    return { success: false, error: error.message };
  }
}

async function archiveEmail(emailIds: string[], accountId: string) {
  try {
    console.log(`[AI Tools] archiveEmail: ${emailIds.length} emails`);

    const { updateMessage } = await import('@/lib/nylas-v3/messages');

    // Archive by moving to 'archive' folder
    const results = await Promise.all(
      emailIds.map(async (id) => {
        try {
          await updateMessage(accountId, id, { folders: ['archive'] });
          return { id, success: true };
        } catch (err: any) {
          return { id, success: false, error: err.message };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    console.log(`[AI Tools] ✅ Archived ${successful}/${emailIds.length} emails`);

    return {
      success: true,
      message: `Archived ${successful} email(s)`,
      results,
    };
  } catch (error: any) {
    console.error('[AI Tools] archiveEmail error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CALENDAR ACTION TOOL IMPLEMENTATIONS
// ============================================

async function createCalendarEvent(params: any, accountId: string) {
  try {
    console.log(`[AI Tools] createCalendarEvent: title=${params.title}`);

    const { db } = await import('@/lib/db/drizzle');
    const { calendarEvents, emailAccounts } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // Get userId from accountId
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Insert into database
    const [event] = await db.insert(calendarEvents).values({
      userId: account.userId,
      title: params.title,
      description: params.description || null,
      location: params.location || null,
      startTime: new Date(params.start_time),
      endTime: new Date(params.end_time),
      attendees: params.attendees || [],
      organizerEmail: account.emailAddress,
      allDay: false,
    }).returning();

    console.log(`[AI Tools] ✅ Calendar event created: ${event.id}`);
    return { success: true, message: 'Calendar event created', event };
  } catch (error: any) {
    console.error('[AI Tools] createCalendarEvent error:', error);
    return { success: false, error: error.message };
  }
}

async function updateCalendarEvent(params: any, accountId: string) {
  try {
    console.log(`[AI Tools] updateCalendarEvent: eventId=${params.event_id}`);

    const { db } = await import('@/lib/db/drizzle');
    const { calendarEvents, emailAccounts } = await import('@/lib/db/schema');
    const { eq, and } = await import('drizzle-orm');

    // Get userId from accountId
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date(),
    };

    if (params.title) updates.title = params.title;
    if (params.description) updates.description = params.description;
    if (params.location) updates.location = params.location;
    if (params.start_time) updates.startTime = new Date(params.start_time);
    if (params.end_time) updates.endTime = new Date(params.end_time);

    // Update in database
    const [event] = await db
      .update(calendarEvents)
      .set(updates)
      .where(and(
        eq(calendarEvents.id, params.event_id),
        eq(calendarEvents.userId, account.userId)
      ))
      .returning();

    if (!event) {
      return { success: false, error: 'Event not found or unauthorized' };
    }

    console.log(`[AI Tools] ✅ Calendar event updated: ${event.id}`);
    return { success: true, message: 'Calendar event updated', event };
  } catch (error: any) {
    console.error('[AI Tools] updateCalendarEvent error:', error);
    return { success: false, error: error.message };
  }
}

async function deleteCalendarEvent(eventId: string, accountId: string) {
  try {
    console.log(`[AI Tools] deleteCalendarEvent: eventId=${eventId}`);

    const { db } = await import('@/lib/db/drizzle');
    const { calendarEvents, emailAccounts } = await import('@/lib/db/schema');
    const { eq, and } = await import('drizzle-orm');

    // Get userId from accountId
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Delete from database
    const [deletedEvent] = await db
      .delete(calendarEvents)
      .where(and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.userId, account.userId)
      ))
      .returning();

    if (!deletedEvent) {
      return { success: false, error: 'Event not found or unauthorized' };
    }

    console.log(`[AI Tools] ✅ Calendar event deleted: ${eventId}`);
    return { success: true, message: 'Calendar event deleted' };
  } catch (error: any) {
    console.error('[AI Tools] deleteCalendarEvent error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CONTACT ACTION TOOL IMPLEMENTATIONS
// ============================================

async function createContact(params: any, userId: string) {
  try {
    console.log(`[AI Tools] createContact: email=${params.email}`);

    const { db } = await import('@/lib/db/drizzle');
    const { contactsV4 } = await import('@/lib/db/schema-contacts-v4');
    const { emailAccounts } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // Get user's first email account for this contact
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.userId, userId),
    });

    if (!account) {
      return { success: false, error: 'No email account found' };
    }

    // Build display name
    const displayName = params.given_name && params.surname
      ? `${params.given_name} ${params.surname}`
      : params.given_name || params.surname || params.email;

    // Insert into database
    const [contact] = await db.insert(contactsV4).values({
      userId,
      accountId: account.id,
      nylasGrantId: account.nylasGrantId || '',
      provider: account.emailProvider || 'manual',
      displayName,
      givenName: params.given_name || null,
      surname: params.surname || null,
      companyName: params.company_name || null,
      jobTitle: params.job_title || null,
      emails: [{ email: params.email, type: 'work' }],
      phoneNumbers: params.phone ? [{ number: params.phone, type: 'work' }] : [],
      source: 'easemail',
      isDeleted: false,
    }).returning();

    console.log(`[AI Tools] ✅ Contact created: ${contact.id}`);
    return { success: true, message: 'Contact created', contact };
  } catch (error: any) {
    console.error('[AI Tools] createContact error:', error);
    return { success: false, error: error.message };
  }
}

async function updateContact(params: any, userId: string) {
  try {
    console.log(`[AI Tools] updateContact: contactId=${params.contact_id}`);

    const { db } = await import('@/lib/db/drizzle');
    const { contactsV4 } = await import('@/lib/db/schema-contacts-v4');
    const { eq, and } = await import('drizzle-orm');

    // Build update object
    const updates: any = {
      updatedAt: new Date(),
    };

    if (params.given_name) updates.givenName = params.given_name;
    if (params.surname) updates.surname = params.surname;
    if (params.company_name) updates.companyName = params.company_name;
    if (params.job_title) updates.jobTitle = params.job_title;

    // Update display name if name fields changed
    if (params.given_name || params.surname) {
      // Fetch existing contact to merge names
      const existing = await db.query.contactsV4.findFirst({
        where: and(
          eq(contactsV4.id, params.contact_id),
          eq(contactsV4.userId, userId)
        ),
      });

      if (existing) {
        const firstName = params.given_name || existing.givenName;
        const lastName = params.surname || existing.surname;
        updates.displayName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || existing.displayName;
      }
    }

    if (params.email) {
      updates.emails = [{ email: params.email, type: 'work' }];
    }

    // Update in database
    const [contact] = await db
      .update(contactsV4)
      .set(updates)
      .where(and(
        eq(contactsV4.id, params.contact_id),
        eq(contactsV4.userId, userId)
      ))
      .returning();

    if (!contact) {
      return { success: false, error: 'Contact not found or unauthorized' };
    }

    console.log(`[AI Tools] ✅ Contact updated: ${contact.id}`);
    return { success: true, message: 'Contact updated', contact };
  } catch (error: any) {
    console.error('[AI Tools] updateContact error:', error);
    return { success: false, error: error.message };
  }
}

async function deleteContact(contactId: string, userId: string) {
  try {
    console.log(`[AI Tools] deleteContact: contactId=${contactId}`);

    const { db } = await import('@/lib/db/drizzle');
    const { contactsV4 } = await import('@/lib/db/schema-contacts-v4');
    const { eq, and } = await import('drizzle-orm');

    // Soft delete by setting isDeleted flag
    const [deletedContact] = await db
      .update(contactsV4)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(and(
        eq(contactsV4.id, contactId),
        eq(contactsV4.userId, userId)
      ))
      .returning();

    if (!deletedContact) {
      return { success: false, error: 'Contact not found or unauthorized' };
    }

    console.log(`[AI Tools] ✅ Contact deleted: ${contactId}`);
    return { success: true, message: 'Contact deleted' };
  } catch (error: any) {
    console.error('[AI Tools] deleteContact error:', error);
    return { success: false, error: error.message };
  }
}
