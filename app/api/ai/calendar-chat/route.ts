/**
 * Calendar AI Chat - Powered by Vercel AI SDK
 * Natural language calendar event creation with streaming responses
 */

import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts, calendarEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';

export const maxDuration = 30; // Allow up to 30 seconds for AI processing

export async function POST(req: Request) {
  try {
    const { messages, accountId } = await req.json();

    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Verify account ownership
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account || account.userId !== user.id) {
      return new Response('Unauthorized access to account', { status: 403 });
    }

    // 3. Get user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const now = new Date();
    const currentLocalTime = now.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'long',
    });

    // 4. Stream response with AI SDK
    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      system: `You are a helpful calendar assistant. You help users create calendar events, query their schedule, and manage their calendar.

Current Context:
- Current date/time: ${currentLocalTime}
- User timezone: ${timezone}
- ISO timestamp: ${now.toISOString()}

Your Responsibilities:
1. **Create Events**: When users ask to create/schedule/add events, use the createEvent tool
2. **Query Calendar**: When users ask about their schedule, use the getEvents tool
3. **Be Conversational**: Be friendly and helpful. If you need more information, ask clarifying questions.

Important Rules:
- Always confirm event details before creating
- Use the user's timezone (${timezone}) for all times
- If details are missing (time, date, title), ask before creating
- Be concise and natural in your responses`,

      tools: {
        // Tool 1: Create Calendar Event
        createEvent: tool({
          description: 'Create a new calendar event',
          parameters: z.object({
            title: z.string().describe('Event title'),
            startTime: z.string().describe('Start time in ISO 8601 format'),
            endTime: z.string().describe('End time in ISO 8601 format'),
            description: z.string().optional().describe('Event description'),
            location: z.string().optional().describe('Event location'),
            attendees: z.array(z.string()).optional().describe('Attendee email addresses'),
          }),
          execute: async ({ title, startTime, endTime, description, location, attendees }) => {
            try {
              console.log('[Calendar Chat] Creating event:', { title, startTime, endTime });

              // Get user's calendars
              const nylas = getNylasClient();
              const calendarsResponse = await nylas.calendars.list({
                identifier: account.nylasGrantId!,
              });

              // Find primary calendar or first writable calendar
              const primaryCalendar = calendarsResponse.data.find(
                (cal: any) => cal.isPrimary && !cal.readOnly
              );
              const writableCalendar = calendarsResponse.data.find((cal: any) => !cal.readOnly);
              const targetCalendar = primaryCalendar || writableCalendar || calendarsResponse.data[0];

              if (!targetCalendar) {
                return {
                  success: false,
                  error: 'No writable calendar found. Please check your calendar settings.',
                };
              }

              // Create event via Nylas
              const eventData: any = {
                title,
                calendar_id: targetCalendar.id,
                when: {
                  start_time: Math.floor(new Date(startTime).getTime() / 1000),
                  end_time: Math.floor(new Date(endTime).getTime() / 1000),
                },
              };

              if (description) {
                eventData.description = description;
              }

              if (location) {
                eventData.location = location;
              }

              if (attendees && attendees.length > 0) {
                eventData.participants = attendees.map((email: string) => ({
                  email,
                  status: 'noreply',
                }));
              }

              const response = await nylas.events.create({
                identifier: account.nylasGrantId!,
                requestBody: eventData,
                queryParams: {
                  calendarId: targetCalendar.id,
                },
              });

              console.log('[Calendar Chat] Event created in Nylas:', response.data.id);

              // Save event to local database
              const dbEventData: any = {
                userId: user.id,
                title: title,
                description: description || null,
                location: location || null,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                allDay: false,
                timezone: timezone,
                status: 'confirmed',
                organizerEmail: account.email,
              };

              // Add attendees if provided
              if (attendees && attendees.length > 0) {
                dbEventData.attendees = attendees.map((email: string) => ({
                  email,
                  status: 'pending',
                }));
              }

              // Determine provider and set appropriate fields
              const provider = account.provider?.toLowerCase() || 'google';
              if (provider === 'google') {
                dbEventData.googleEventId = response.data.id;
                dbEventData.googleCalendarId = targetCalendar.id;
                dbEventData.googleSyncStatus = 'synced';
                dbEventData.googleLastSyncedAt = new Date();
              } else if (provider === 'microsoft' || provider === 'outlook') {
                dbEventData.microsoftEventId = response.data.id;
                dbEventData.microsoftCalendarId = targetCalendar.id;
                dbEventData.microsoftSyncStatus = 'synced';
                dbEventData.microsoftLastSyncedAt = new Date();
              }

              // Insert into database
              const [dbEvent] = await db.insert(calendarEvents).values(dbEventData).returning();

              console.log('[Calendar Chat] Event saved to database:', dbEvent.id);

              return {
                success: true,
                event: {
                  id: response.data.id,
                  dbId: dbEvent.id,
                  title,
                  startTime,
                  endTime,
                  calendar: targetCalendar.name,
                },
              };
            } catch (error: any) {
              console.error('[Calendar Chat] Error creating event:', error);
              return {
                success: false,
                error: error.message || 'Failed to create event',
              };
            }
          },
        }),

        // Tool 2: Get Calendar Events
        getEvents: tool({
          description: 'Get calendar events for a specific time range',
          parameters: z.object({
            startDate: z.string().describe('Start date in ISO 8601 format'),
            endDate: z.string().describe('End date in ISO 8601 format'),
          }),
          execute: async ({ startDate, endDate }) => {
            try {
              console.log('[Calendar Chat] Fetching events:', { startDate, endDate });

              const nylas = getNylasClient();

              // Get all calendars
              const calendarsResponse = await nylas.calendars.list({
                identifier: account.nylasGrantId!,
              });

              const calendarIds = calendarsResponse.data.map((cal: any) => cal.id);

              // Fetch events from all calendars
              const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
              const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

              const eventPromises = calendarIds.map(async (calId: string) => {
                try {
                  const events = await nylas.events.list({
                    identifier: account.nylasGrantId!,
                    queryParams: {
                      calendar_id: calId,
                      start: startTimestamp,
                      end: endTimestamp,
                    },
                  });
                  return events.data;
                } catch (err) {
                  console.error(`[Calendar Chat] Error fetching events for calendar ${calId}:`, err);
                  return [];
                }
              });

              const eventArrays = await Promise.all(eventPromises);
              const allEvents = eventArrays.flat();

              // Format events for AI
              const formattedEvents = allEvents.map((event: any) => {
                const start = event.when?.startTime
                  ? new Date(event.when.startTime * 1000).toLocaleString('en-US', { timeZone: timezone })
                  : event.when?.date;
                const end = event.when?.endTime
                  ? new Date(event.when.endTime * 1000).toLocaleString('en-US', { timeZone: timezone })
                  : null;

                return {
                  title: event.title,
                  start,
                  end,
                  location: event.location,
                  participants: event.participants?.map((p: any) => p.email) || [],
                };
              });

              console.log('[Calendar Chat] Found events:', formattedEvents.length);

              return {
                success: true,
                events: formattedEvents,
                count: formattedEvents.length,
              };
            } catch (error: any) {
              console.error('[Calendar Chat] Error fetching events:', error);
              return {
                success: false,
                error: error.message || 'Failed to fetch events',
              };
            }
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('[Calendar Chat] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
