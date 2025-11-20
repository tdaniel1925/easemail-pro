/**
 * Calendar Assistant API
 * Smart intent detection and calendar query handling
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { input, accountId, conversationHistory = [] } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    // 3. Detect intent using GPT-4o
    const currentDate = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const currentLocalTime = currentDate.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'long',
    });

    // Step 1: Intent Detection
    const intentPrompt = `You are a smart intent classifier for a calendar assistant.

Current Context:
- Current date/time: ${currentLocalTime}
- User timezone: ${timezone}

Your job is to determine the user's intent from their message. Classify into one of these intents:

1. **create_event**: User wants to create a new calendar event
   - Examples: "Schedule meeting tomorrow at 2pm", "Add lunch with John on Friday", "Create event for team standup"

2. **query_schedule**: User wants to view or query their calendar
   - Examples: "What do I have tomorrow?", "Show my schedule for next week", "Am I free on Friday afternoon?"

3. **find_conflicts**: User wants to check for scheduling conflicts
   - Examples: "Do I have any conflicts next week?", "Can I schedule a meeting at 3pm tomorrow?"

4. **general_question**: General questions about calendar management
   - Examples: "How do I add attendees?", "What's the best time for a team meeting?", "Help me plan my week"

Respond with JSON in this exact format:
{
  "intent": "create_event" | "query_schedule" | "find_conflicts" | "general_question",
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why you chose this intent"
}

User message: "${input}"`;

    const intentResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 256,
      temperature: 0.2,
      messages: [
        { role: 'system', content: intentPrompt },
        { role: 'user', content: input },
      ],
      response_format: { type: 'json_object' },
    });

    const intentContent = intentResponse.choices[0]?.message?.content;
    if (!intentContent) {
      throw new Error('No intent response from GPT-4o');
    }

    const intentData = JSON.parse(intentContent);
    console.log('[Calendar Assistant] Intent detected:', intentData);

    // Step 2: Route based on intent
    if (intentData.intent === 'create_event') {
      // Return intent for client to handle via parse-event API
      return NextResponse.json({
        success: true,
        intent: 'create_event',
        confidence: intentData.confidence,
      });
    }

    // For query/conflict/general intents, fetch user's calendar events
    const nylas = getNylasClient();

    // Fetch calendars first
    const calendarsResponse = await nylas.calendars.list({
      identifier: account.nylasGrantId!,
    });

    const calendarIds = calendarsResponse.data.map((cal: any) => cal.id);

    // Fetch events for the next 30 days
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);

    const eventPromises = calendarIds.map(async (calId: string) => {
      try {
        const events = await nylas.events.list({
          identifier: account.nylasGrantId!,
          queryParams: {
            calendarId: calId,
            start: startTime.toString(),
            end: endTime.toString(),
          },
        });
        return events.data;
      } catch (err) {
        console.error(`[Calendar Assistant] Error fetching events for calendar ${calId}:`, err);
        return [];
      }
    });

    const eventArrays = await Promise.all(eventPromises);
    const allEvents = eventArrays.flat();

    // Format events for GPT
    const formattedEvents = allEvents
      .filter((event: any) => event.when?.startTime || event.when?.date)
      .map((event: any) => {
        const startTime = event.when?.startTime
          ? new Date(event.when.startTime * 1000).toLocaleString('en-US', { timeZone: timezone })
          : event.when?.date;
        const endTime = event.when?.endTime
          ? new Date(event.when.endTime * 1000).toLocaleString('en-US', { timeZone: timezone })
          : null;

        return {
          title: event.title,
          start: startTime,
          end: endTime,
          location: event.location,
          participants: event.participants?.map((p: any) => p.email) || [],
        };
      });

    // Step 3: Generate response based on intent and calendar data
    const assistantPrompt = `You are a helpful calendar assistant. The user has asked about their calendar.

Current Context:
- Current date/time: ${currentLocalTime}
- User timezone: ${timezone}
- User intent: ${intentData.intent}

User's upcoming events (next 30 days):
${formattedEvents.length > 0 ? JSON.stringify(formattedEvents, null, 2) : 'No upcoming events'}

Instructions:
- Answer the user's question based on their calendar data
- Be concise, friendly, and helpful
- Use natural language (avoid JSON in response)
- Format dates and times in a readable way
- If they ask about a specific day, show all events for that day
- If they ask about conflicts, check for overlapping times
- If they ask a general question, provide helpful guidance

User question: "${input}"

Provide a helpful, conversational response:`;

    const assistantResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 512,
      temperature: 0.5,
      messages: [
        ...conversationHistory,
        { role: 'system', content: assistantPrompt },
        { role: 'user', content: input },
      ],
    });

    const responseContent = assistantResponse.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from GPT-4o');
    }

    console.log('[Calendar Assistant] Response generated:', responseContent);

    return NextResponse.json({
      success: true,
      intent: intentData.intent,
      response: responseContent,
      confidence: intentData.confidence,
    });

  } catch (error: any) {
    console.error('[Calendar Assistant] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
      },
      { status: 500 }
    );
  }
}
