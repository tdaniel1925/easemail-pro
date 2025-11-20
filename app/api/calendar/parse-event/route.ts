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
    const { input, conversationHistory = [] } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }

    const currentDate = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

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
- Current date/time: ${currentDate.toISOString()}
- User's timezone: ${timezone}
- Day of week: ${currentDate.toLocaleDateString('en-US', { weekday: 'long' })}

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
   - If no date/time is provided: "When would you like to schedule this event?"
   - If duration is unclear: "How long should this event last?"
   - If the description is too vague: "Could you provide more details about this event?"
   - If "12" is mentioned without am/pm: "Did you mean 12:00 PM (noon) or 12:00 AM (midnight)?"

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
   - ALWAYS parse duration expressions (e.g., "for X hours/minutes")
   - Be conversational and friendly when asking questions
   - Default to the future (never suggest past dates)
   - Use 24-hour time internally but understand 12-hour format
   - Return ISO 8601 timestamps for all dates/times
   - If "Friday" is mentioned, find the next Friday from current date
   - If "tomorrow" is mentioned, use the next day
   - If "tonight" is mentioned, use today's date with evening time
   - Be intelligent about context (e.g., "lunch" implies around 12pm, "dinner" implies around 6-7pm)

6. **Examples of Good Parsing:**

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
