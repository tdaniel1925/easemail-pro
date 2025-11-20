/**
 * AI-Powered Calendar Event Parser
 * Uses GPT-4o to intelligently parse natural language event descriptions
 * Handles durations, complex timing, and asks clarifying questions when needed
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { input, conversationHistory = [], timezone: clientTimezone } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }

    const currentDate = new Date();
    // Use client-provided timezone (from browser) instead of server timezone
    const timezone = clientTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Get current time in user's local timezone for better context
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

    // Build conversation messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...conversationHistory,
      {
        role: 'user',
        content: input,
      },
    ];

    // System prompt for intelligent event parsing
    const systemPrompt = `You are an intelligent calendar event parser assistant. Your job is to understand natural language event descriptions and extract structured event data.

Current Context:
- Current date/time IN USER'S TIMEZONE (${timezone}): ${currentLocalTime}
- ISO timestamp: ${currentDate.toISOString()}
- **IMPORTANT: All times mentioned by the user are in ${timezone} unless explicitly stated otherwise**

Your Responsibilities:

1. **Parse event details comprehensively:**
   - Title (what is the event about?)
   - Start date and time (when does it begin?)
   - End date and time (when does it end?)
   - Duration (if specified like "for 2 hours", "for 30 minutes", calculate end time from start time + duration)
   - Location (where is it happening?)
   - Description (any additional context)
   - Attendees (who should be invited?)

2. **Handle duration expressions intelligently:**
   - "for 2 hours" means event lasts 2 hours from start time
   - "for 30 minutes" means event lasts 30 minutes from start time
   - "from X to Y" means explicit start and end times
   - If only start time given and no duration, ask for clarification or assume 1 hour

3. **Ask clarifying questions when information is ambiguous or missing:**
   - **CRITICAL: If no title/event name is provided, ALWAYS ask for clarification**
   - If no date/time is provided: "When would you like to schedule this event?"
   - If duration is unclear: "How long should this event last?"
   - If only a duration is provided (e.g., "2 hours") without event name or time: "What event would you like to schedule, and when?"
   - If the description is too vague: "Could you provide more details about this event?"
   - If "12" is mentioned without am/pm: "Did you mean 12:00 PM (noon) or 12:00 AM (midnight)?"
   - **DO NOT make up or assume event titles - always ask if unclear**

4. **Output Format:**
   You MUST respond in one of two ways:

   **Option A - If you have enough information to create the event:**
   \`\`\`json
   {
     "needsClarification": false,
     "event": {
       "title": "Event Title",
       "startTime": "2025-11-22T14:00:00Z",
       "endTime": "2025-11-22T16:00:00Z",
       "location": "Location name or null",
       "description": "Description or null",
       "attendees": ["email1@example.com"] or []
     },
     "confidence": "high" | "medium" | "low",
     "explanation": "Brief explanation of what you understood"
   }
   \`\`\`

   **Option B - If you need clarification:**
   \`\`\`json
   {
     "needsClarification": true,
     "question": "Your clarifying question here",
     "partialEvent": {
       "title": "Partial title if available",
       "startTime": "ISO date if known, or null",
       "endTime": "ISO date if known, or null",
       "location": "Location if mentioned, or null"
     }
   }
   \`\`\`

5. **Important Rules:**
   - **NEVER create an event without a clear title - always ask for clarification if title is missing**
   - ALWAYS parse duration expressions (e.g., "for X hours/minutes")
   - **CRITICAL: When following up on a clarification question, PRESERVE all previously mentioned times and details from the conversation history**
   - **When user confirms with "yes", "correct", "that's right", etc., use the EXACT times from your previous message - DO NOT recalculate or change them**
   - Be conversational and friendly when asking questions
   - Default to the future (never suggest past dates)
   - Use 24-hour time internally but understand 12-hour format
   - If input is incomplete (e.g., just a duration), request the missing information
   - **CRITICAL: Parse AM/PM correctly:**
     * "10 a.m." or "10am" = 10:00 (morning)
     * "10 p.m." or "10pm" = 22:00 (evening)
     * "12 a.m." or "12am" = 00:00 (midnight)
     * "12 p.m." or "12pm" = 12:00 (noon)
   - **CRITICAL TIMEZONE RULE: The user is in ${timezone} timezone. ALL times they mention are in ${timezone}**
     * When user says "10am tomorrow", they mean 10am ${timezone} time
     * Return ISO timestamps that represent the LOCAL time in ${timezone}, not UTC
     * Use format like "2025-11-22T10:00:00" (which JavaScript will interpret as local time)
     * OR use format with explicit offset like "2025-11-22T10:00:00-06:00" for Central Time
     * NEVER return "2025-11-22T10:00:00Z" (Z means UTC) when user means 10am local time
     * If you say "10:00 AM" in your explanation, the timestamp MUST also be 10:00 AM in ${timezone}, not 10:00 AM UTC
   - If "Friday" is mentioned, find the next Friday from current date
   - If "tomorrow" is mentioned, use the next day
   - If "tonight" is mentioned, use today's date with evening time
   - Be intelligent about context (e.g., "lunch" implies around 12pm, "dinner" implies around 6-7pm)

6. **Examples of Good Parsing:**

Input: "10 a.m. on Friday for 2 hours with John from accounting"
Output: Event on Friday at 10:00 (morning) for 2 hours (until 12:00)

Input: "Friday at 12 am for 2 hours"
Output: Event from Friday 00:00 to Friday 02:00 (2 hours duration correctly applied)

Input: "Team meeting tomorrow at 3pm for 90 minutes"
Output: Event tomorrow at 15:00 for 1.5 hours (until 16:30)

Input: "Lunch with Sarah next Tuesday"
Output: Ask "What time should I schedule lunch with Sarah? (default is 12:00 PM)"

Input: "Dentist appointment"
Output: Ask "When would you like to schedule your dentist appointment?"

Input: "Meeting at 12"
Output: Ask "Did you mean 12:00 PM (noon) or 12:00 AM (midnight)?"

Now, parse the user's input and respond with the appropriate JSON format.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      temperature: 0.3, // Lower temperature for more consistent parsing
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      response_format: { type: 'json_object' }, // Force JSON response
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4o');
    }

    // Extract JSON from the response
    let parsedData;
    try {
      // Try to extract JSON from code blocks first
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/```\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        // Try to parse the entire response as JSON
        parsedData = JSON.parse(content);
      }
    } catch (parseError) {
      // If JSON parsing fails, treat it as a clarification question
      return NextResponse.json({
        success: true,
        needsClarification: true,
        question: content,
        rawResponse: content,
      });
    }

    // Log for debugging
    console.log('[AI Parser] Raw AI Response:', content);
    console.log('[AI Parser] Parsed Data:', JSON.stringify(parsedData, null, 2));
    console.log('[AI Parser] Client timezone:', clientTimezone);
    console.log('[AI Parser] Using timezone:', timezone);
    console.log('[AI Parser] Current date:', currentDate.toISOString());
    console.log('[AI Parser] Current local time:', currentLocalTime);

    return NextResponse.json({
      success: true,
      ...parsedData,
      rawResponse: content,
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
