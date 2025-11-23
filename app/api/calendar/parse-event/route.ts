/**
 * AI-Powered Calendar Event Parser V4
 * Uses GPT-4o with structured output for INSTANT event creation
 * NO clarification questions - uses smart defaults instead
 *
 * Changes from V3:
 * - Uses response_format with strict JSON schema
 * - Never asks clarification questions
 * - Auto-fills missing fields with intelligent defaults
 * - Returns structured CalendarEvent object
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Zod schema for calendar event - enforces strict structure
 */
const CalendarEventSchema = z.object({
  title: z.string().describe('Event title or summary'),
  startTime: z.string().describe('Start time in ISO 8601 format'),
  endTime: z.string().describe('End time in ISO 8601 format'),
  location: z.string().nullable().describe('Location or null if not specified'),
  description: z.string().nullable().describe('Event description or null'),
  attendees: z.array(z.string().email()).describe('Array of attendee email addresses'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the parse'),
  explanation: z.string().describe('Brief explanation of what was understood and any defaults used'),
});

type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export async function POST(request: NextRequest) {
  try {
    const { input, timezone: clientTimezone } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }

    const currentDate = new Date();
    const timezone = clientTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Get current time in user's timezone for context
    const currentLocalTime = currentDate.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'long'
    });

    // Calculate tomorrow's date explicitly in user's timezone
    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowFormatted = tomorrowDate.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // System prompt for INSTANT parsing with smart defaults
    const systemPrompt = `You are a calendar event parser that creates events INSTANTLY with smart defaults.

Current Context:
- Current date/time in ${timezone}: ${currentLocalTime}
- Tomorrow's date in ${timezone}: ${tomorrowFormatted}
- ISO timestamp: ${currentDate.toISOString()}
- User timezone: ${timezone}

IMPORTANT: When the user says "tomorrow", use the date: ${tomorrowFormatted}

Core Rules - NEVER ASK QUESTIONS:

1. **ALWAYS create an event immediately** - Use smart defaults for missing information:
   - **Missing title**: Extract topic from context or use "New Event"
   - **Missing time**: Use next available hour (round up from current time)
   - **Missing duration**: Default to 1 hour
   - **Missing date**: Default to today if time in future, otherwise tomorrow
   - **Missing location**: Set to null
   - **Missing attendees**: Empty array

2. **Smart Defaults:**
   - "lunch" → 12:00 PM, 1 hour duration
   - "dinner" → 6:00 PM, 1.5 hour duration
   - "breakfast" → 8:00 AM, 1 hour duration
   - "meeting" → 1 hour duration
   - "call" → 30 minutes duration
   - "coffee" → 30 minutes duration

3. **Duration Parsing:**
   - "for 2 hours" → 2 hour duration
   - "for 30 minutes" → 30 min duration
   - "from X to Y" → explicit start/end
   - No duration specified → 1 hour default

4. **Time Parsing (${timezone}):**
   - "tomorrow at 3pm" → tomorrow 15:00 in ${timezone}
   - "Friday at 10am" → next Friday 10:00 in ${timezone}
   - "12" without am/pm → assume 12:00 PM (noon)
   - Always return ISO 8601 with local timezone offset
   - NEVER use Z suffix (UTC) unless explicitly UTC

5. **Confidence Levels:**
   - HIGH: All key details provided (title, time, duration)
   - MEDIUM: Some details inferred from context
   - LOW: Most details defaulted

6. **Examples:**

Input: "lunch tomorrow"
Output:
{
  "title": "Lunch",
  "startTime": "[tomorrow at 12:00 PM in ${timezone}]",
  "endTime": "[tomorrow at 1:00 PM in ${timezone}]",
  "location": null,
  "description": null,
  "attendees": [],
  "confidence": "medium",
  "explanation": "Created lunch event tomorrow at noon (default lunch time) for 1 hour"
}

Input: "team meeting Friday 3pm for 90 minutes"
Output:
{
  "title": "Team meeting",
  "startTime": "[next Friday at 3:00 PM in ${timezone}]",
  "endTime": "[next Friday at 4:30 PM in ${timezone}]",
  "location": null,
  "description": null,
  "attendees": [],
  "confidence": "high",
  "explanation": "Created team meeting on Friday at 3pm for 90 minutes"
}

Input: "call"
Output:
{
  "title": "Call",
  "startTime": "[next hour in ${timezone}]",
  "endTime": "[next hour + 30 min in ${timezone}]",
  "location": null,
  "description": null,
  "attendees": [],
  "confidence": "low",
  "explanation": "Created call for next available hour, 30 minute duration (default for calls)"
}

Now parse the user's input and create an event immediately with smart defaults.`;

    // Use structured output with Zod schema - guaranteed valid response
    const response = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06', // Latest model with structured output support
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: input,
        },
      ],
      response_format: zodResponseFormat(CalendarEventSchema, 'calendar_event'),
    });

    const event = response.choices[0]?.message?.parsed;

    if (!event) {
      throw new Error('No valid event parsed from GPT-4o');
    }

    // Log for debugging
    console.log('[AI Parser V4] Input:', input);
    console.log('[AI Parser V4] Current Date (server):', currentDate.toISOString());
    console.log('[AI Parser V4] Current Date (user TZ):', currentLocalTime);
    console.log('[AI Parser V4] Tomorrow Date (user TZ):', tomorrowFormatted);
    console.log('[AI Parser V4] Parsed Event:', JSON.stringify(event, null, 2));
    console.log('[AI Parser V4] Timezone:', timezone);
    console.log('[AI Parser V4] Confidence:', event.confidence);
    console.log('[AI Parser V4] Explanation:', event.explanation);

    // Validate dates
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format in parsed event');
    }

    if (endDate <= startDate) {
      throw new Error('End time must be after start time');
    }

    return NextResponse.json({
      success: true,
      event,
    });

  } catch (error: any) {
    console.error('AI event parsing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to parse event',
      },
      { status: 500 }
    );
  }
}
